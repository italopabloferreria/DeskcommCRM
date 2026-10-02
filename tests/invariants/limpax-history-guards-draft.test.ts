/** Disposable DB only: synthetic subject and transaction rollback per case. */
import { readFileSync } from "node:fs";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import pg from "pg";
if (
  !process.env.TEST_DB_CONTAINER ||
  !process.env.TEST_DB_TEMPLATE ||
  process.env.DESKCOMM_INVARIANTS_DB_RESET !== "1" ||
  !/^\d+$/.test(process.env.TEST_DB_PORT ?? "")
)
  throw new Error("Disposable test:db harness required.");
const pool = new pg.Pool({
  connectionString:
    "postgresql://postgres:postgres@127.0.0.1:" + process.env.TEST_DB_PORT + "/postgres",
});
let db: pg.PoolClient;
const org = "6e000000-0000-4000-8000-000000000001",
  other = "6e000000-0000-4000-8000-000000000002",
  user = "6e100000-0000-4000-8000-000000000001",
  person = "6e200000-0000-4000-8000-000000000001",
  contact = "6e300000-0000-4000-8000-000000000001";
const row = {
  data_row_index: 1,
  row_kind: "service",
  company_id: null,
  person_id: person,
  location_id: null,
  create_address: "Endereço fictício",
  raw_data: { headers: ["Nome"], cells: ["Pessoa fictícia"] },
  original_reference: { sheet: "synthetic" },
  service_date: "2020-01-01",
  value_cents: 123,
  currency: null,
  notes_original: "Nota fictícia",
};
async function login() {
  await db.query("set local role authenticated");
  await db.query("select set_config('request.jwt.claims',$1,true)", [
    JSON.stringify({ sub: user, role: "authenticated" }),
  ]);
}
async function command(hash = "c".repeat(64)) {
  await login();
  const result = await db.query(
    "select public.fn_limpax_history_import_atomic($1,$2,'synthetic.csv',$3::jsonb) receipt",
    [org, hash, JSON.stringify([row])],
  );
  await db.query("reset role");
  return result.rows[0].receipt;
}
beforeAll(async () => {
  db = await pool.connect();
  await db.query(readFileSync("supabase/drafts/limpax_history_provisioner.sql", "utf8"));
  await db.query("select public.fn_limpax_historico_provisionar()");
  await db.query(readFileSync("supabase/drafts/limpax_history_atomic.sql", "utf8"));
  await db.query(readFileSync("supabase/drafts/limpax_history_lifecycle.sql", "utf8"));
  await db.query(readFileSync("supabase/drafts/limpax_history_management.sql", "utf8"));
}, 30000);
beforeEach(async () => {
  await db.query("begin");
  await db.query("insert into auth.users(id,email) values($1,'lifecycle@example.invalid')", [user]);
  await db.query(
    "insert into public.organizations(id,slug,legal_name,display_name) values($1,'lifecycle','Fictício','Fictício'),($2,'lifecycle-other','Outro','Outro')",
    [org, other],
  );
  await db.query(
    "insert into public.user_organizations(user_id,organization_id,role,accepted_at) values($1,$2,'manager',now())",
    [user, org],
  );
  await db.query(
    "insert into public.people(id,organization_id,full_name) values($1,$2,'Pessoa fictícia')",
    [person, org],
  );
  await db.query(
    "insert into public.contacts(id,organization_id,person_id,name) values($1,$2,$3,'Pessoa fictícia')",
    [contact, org, person],
  );
});
afterEach(async () => {
  await db.query("rollback");
});
afterAll(async () => {
  if (db) db.release();
  await pool.end();
});
const key = "6e400000-0000-4000-8000-000000000001";
const patch = {
  service_date: "2021-02-01",
  value_cents: 0,
  currency: null,
  notes_current: "Corrigido fictício",
  location_id: null,
};
async function prepare() {
  await db.query("delete from public.contacts where id=$1", [contact]);
  await command();
  await db.query("update public.user_organizations set role='admin' where user_id=$1", [user]);
  return (
    await db.query("select id from public.limpax_service_history where organization_id=$1", [org])
  ).rows[0].id as string;
}
async function manage(id: string, body: unknown, kind = "service") {
  await login();
  const result = await db.query(
    "select public.fn_limpax_history_manage($1,$2,$3,$4::jsonb) result",
    [org, kind, id, JSON.stringify(body)],
  );
  await db.query("reset role");
  return result.rows[0].result;
}
async function denied(id: string, body: unknown, code: string, kind = "service") {
  await db.query("savepoint negative");
  await expect(manage(id, body, kind)).rejects.toMatchObject({ code });
  await db.query("rollback to savepoint negative");
}
const correction = {
  action: "correct",
  request_id: key,
  expected_version: 0,
  reason: "source_review",
  patch,
};

describe("guardas indiretas e leitura do histórico", () => {
  it("anonimização impede reidentificar vínculo de empresa", async () => {
    await prepare();
    await db.query(
      "insert into public.companies(id,organization_id,trade_name) values($1,$2,'Empresa fictícia')",
      [contact, org],
    );
    await db.query(
      "insert into public.company_people(organization_id,company_id,person_id,notes) values($1,$2,$3,'Nota pessoal')",
      [org, contact, person],
    );
    await manage(person, { action: "redact_person", request_id: key, confirm: true }, "person");
    const current = await db.query("select notes from public.company_people where person_id=$1", [
      person,
    ]);
    expect(current.rows[0].notes).toBeNull();
    await db.query("savepoint n");
    await expect(
      db.query("update public.company_people set notes='Restaurar' where person_id=$1", [person]),
    ).rejects.toMatchObject({ code: "42501" });
    await db.query("rollback to savepoint n");
  });
  it("anonimização impede restaurar bruto por import_rows", async () => {
    await prepare();
    await manage(person, { action: "redact_person", request_id: key, confirm: true }, "person");
    await db.query("savepoint n");
    await expect(
      db.query("update public.import_rows set raw_data=$2::jsonb where person_id=$1", [
        person,
        JSON.stringify({ name: "Restaurar" }),
      ]),
    ).rejects.toMatchObject({ code: "42501" });
    await db.query("rollback to savepoint n");
    expect(
      (await db.query("select raw_data from public.import_rows where person_id=$1", [person]))
        .rows[0].raw_data,
    ).toEqual({});
  });
  it("pessoa anonimizada não recebe telefone ativo novo", async () => {
    await prepare();
    await manage(person, { action: "redact_person", request_id: key, confirm: true }, "person");
    await db.query("savepoint n");
    await expect(
      db.query(
        "insert into public.contacts(id,organization_id,person_id,name) values($1,$2,$3,'Restaurar')",
        [contact, org, person],
      ),
    ).rejects.toMatchObject({ code: "42501" });
    await db.query("rollback to savepoint n");
    expect(
      (await db.query("select count(*)::int n from public.contacts where person_id=$1", [person]))
        .rows[0].n,
    ).toBe(0);
  });
  it("rota anterior por contato também limpa texto corrigido", async () => {
    const id = await prepare();
    await manage(id, correction);
    await db.query(
      "insert into public.contacts(id,organization_id,person_id,name) values($1,$2,$3,'Fictício')",
      [contact, org, person],
    );
    await db.query(
      "update public.contacts set is_anonymized=true,anonymized_at=now() where id=$1",
      [contact],
    );
    expect(
      (
        await db.query(
          "select notes_current,raw_data from public.limpax_service_history where id=$1",
          [id],
        )
      ).rows[0],
    ).toMatchObject({ notes_current: "", raw_data: {} });
  });
  it("leitura devolve local do cliente e capacidades; cursor avança sem truncar", async () => {
    await prepare();
    const rows = Array.from({ length: 26 }, (_, i) => ({
      ...row,
      data_row_index: i + 1,
      notes_original: "Serviço " + i,
    }));
    await login();
    await db.query(
      "select public.fn_limpax_history_import_atomic($1,$2,'synthetic.csv',$3::jsonb)",
      [org, "d".repeat(64), JSON.stringify(rows)],
    );
    const first = (
      await db.query("select public.fn_limpax_history_view($1,'person',$2,null) data", [
        org,
        person,
      ])
    ).rows[0].data;
    expect(first.items).toHaveLength(26);
    expect(first).toMatchObject({
      can_correct: true,
      can_void: true,
      can_redact: true,
      can_export: true,
      locations_truncated: false,
    });
    expect(first.locations[0].address_original).toBe("Endereço fictício");
    const last = (
      await db.query("select public.fn_limpax_history_view($1,'person',$2,$3) data", [
        org,
        person,
        first.items[24].id,
      ])
    ).rows[0].data;
    expect(last.items).toHaveLength(2);
    expect(last.items[0].id).toBe(first.items[25].id);
    await db.query("reset role");
  });
  it("usuário revogado não usa comando por RPC", async () => {
    const id = await prepare();
    await db.query("update public.user_organizations set revoked_at=now() where user_id=$1", [
      user,
    ]);
    await denied(id, correction, "42501");
  });
});
