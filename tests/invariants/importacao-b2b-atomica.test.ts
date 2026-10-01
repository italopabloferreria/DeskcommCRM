/** Prova do baseline completo e duas conexões PostgreSQL. Só via pnpm test:db. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import pg from "pg";
if (!process.env.TEST_DB_CONTAINER)
  throw new Error("Use pnpm test:db; não aponta para banco real.");
const pool = new pg.Pool({
  connectionString: `postgresql://postgres:postgres@127.0.0.1:${process.env.TEST_DB_PORT ?? 54329}/postgres`,
  max: 3,
});
const ORG = "49500000-0000-4000-8000-000000000001",
  OTHER = "49500000-0000-4000-8000-000000000002";
const USER = "49500000-1111-4000-8000-000000000001",
  VIEWER = "49500000-1111-4000-8000-000000000002";
const mapping = { company_name: "Empresa", person_name: "Pessoa" };
const row = (company: string, person: string, phone: string | null) => ({
  raw_data: { Empresa: company, Pessoa: person },
  normalized_data: {
    company_name: company,
    person_name: person,
    normalized_name: person.toLowerCase(),
    phone_e164: phone,
    phone_variants: phone ? [phone] : [],
    email: "person@example.invalid",
  },
});
async function asUser(user: string) {
  const client = await pool.connect();
  await client.query("begin");
  await client.query("set local role authenticated");
  await client.query("select set_config('request.jwt.claims',$1,true)", [
    JSON.stringify({ sub: user, role: "authenticated" }),
  ]);
  return client;
}
const call = (client: pg.PoolClient, rows: unknown[], org = ORG) =>
  client.query(
    "select public.fn_import_companies_people_atomic($1,$2,$3::jsonb,$4::jsonb) as result",
    [org, "synthetic.csv", JSON.stringify(mapping), JSON.stringify(rows)],
  );
beforeAll(async () => {
  await pool.query(
    "insert into auth.users(id,email) values($1,'manager495@example.invalid'),($2,'viewer495@example.invalid') on conflict(id) do nothing",
    [USER, VIEWER],
  );
  await pool.query(
    "insert into public.organizations(id,slug,legal_name,display_name) values($1,'inv-import495','Import fictício 495','Import fictício 495'),($2,'inv-import495-other','Outro fictício 495','Outro fictício 495') on conflict(id) do nothing",
    [ORG, OTHER],
  );
  await pool.query(
    "insert into public.user_organizations(user_id,organization_id,role,accepted_at) values($1,$3,'manager',now()),($2,$3,'viewer',now()) on conflict do nothing",
    [USER, VIEWER, ORG],
  );
});
afterAll(async () => pool.end());
describe("importação atômica no baseline completo", () => {
  it("dois pedidos concorrentes: o segundo é recusado antes de gravar", async () => {
    const first = await asUser(USER),
      second = await asUser(USER);
    try {
      await first.query("select pg_advisory_xact_lock(hashtextextended('crm-import:' || $1,0))", [
        ORG,
      ]);
      await expect(
        call(second, [row("Concorrência fictícia", "Pessoa fictícia", null)]),
      ).rejects.toMatchObject({ code: "55006" });
    } finally {
      await first.query("rollback");
      await second.query("rollback");
      first.release();
      second.release();
    }
  });
  it("confirma lote e replay sem duplicar registros", async () => {
    const rows = [row("Empresa fictícia 495", "Pessoa fictícia 495", "+5511999949500")];
    const first = await asUser(USER);
    let original: string;
    try {
      const result = (await call(first, rows)).rows[0].result;
      expect(result.successful_rows).toBe(1);
      original = result.batch_id;
      await first.query("commit");
    } finally {
      await first.query("rollback");
      first.release();
    }
    const second = await asUser(USER);
    try {
      const result = (await call(second, rows)).rows[0].result;
      expect(result.reused).toBe(true);
      expect(result.batch_id).toBe(original!);
      await second.query("commit");
    } finally {
      await second.query("rollback");
      second.release();
    }
    const count = await pool.query(
      "select count(*)::int as n from public.companies where organization_id=$1 and trade_name='Empresa fictícia 495'",
      [ORG],
    );
    expect(count.rows[0].n).toBe(1);
  });
  it.each([
    [VIEWER, ORG],
    [USER, OTHER],
  ])("recusa papel/organização sem autorização", async (user, org) => {
    const client = await asUser(user);
    try {
      await expect(call(client, [row("Recusado", "Pessoa", null)], org)).rejects.toMatchObject({
        code: "42501",
      });
    } finally {
      await client.query("rollback");
      client.release();
    }
  });
  it("ROLLBACK externo preserva zero novos lotes e empresas", async () => {
    const before = (
      await pool.query(
        "select count(*)::int as n from public.import_batches where organization_id=$1",
        [ORG],
      )
    ).rows[0].n;
    const client = await asUser(USER);
    try {
      expect(
        (await call(client, [row("Somente rollback", "Pessoa rollback", null)])).rows[0].result
          .successful_rows,
      ).toBe(1);
    } finally {
      await client.query("rollback");
      client.release();
    }
    expect(
      (
        await pool.query(
          "select count(*)::int as n from public.import_batches where organization_id=$1",
          [ORG],
        )
      ).rows[0].n,
    ).toBe(before);
    expect(
      (
        await pool.query(
          "select count(*)::int as n from public.companies where organization_id=$1 and trade_name='Somente rollback'",
          [ORG],
        )
      ).rows[0].n,
    ).toBe(0);
  });
});
