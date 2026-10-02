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
async function redact() {
  await db.query(
    "update public.contacts set is_anonymized=true,anonymized_at=now() where id=$1 and organization_id=$2",
    [contact, org],
  );
}
beforeAll(async () => {
  db = await pool.connect();
  await db.query(readFileSync("supabase/drafts/limpax_history_provisioner.sql", "utf8"));
  await db.query("select public.fn_limpax_historico_provisionar()");
  await db.query(readFileSync("supabase/drafts/limpax_history_atomic.sql", "utf8"));
  await db.query(readFileSync("supabase/drafts/limpax_history_lifecycle.sql", "utf8"));
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
describe("ciclo de anonimização do histórico rascunhado", () => {
  it("limpa cópias, local e campos operacionais sem apagar recibo/origem", async () => {
    const first = await command();
    await redact();
    const history = (
      await db.query(
        "select raw_data,original_reference,notes_original,service_date,value_cents,currency,redacted_at from public.limpax_service_history where organization_id=$1",
        [org],
      )
    ).rows[0];
    expect(history).toMatchObject({
      raw_data: {},
      original_reference: null,
      notes_original: "",
      service_date: null,
      value_cents: null,
      currency: null,
    });
    expect(history.redacted_at).not.toBeNull();
    const location = (
      await db.query(
        "select address_original,redacted_at from public.limpax_customer_locations where organization_id=$1",
        [org],
      )
    ).rows[0];
    expect(location.address_original).toBe("[redacted]");
    expect(location.redacted_at).not.toBeNull();
    expect(
      (
        await db.query(
          "select raw_data,normalized_data from public.import_rows where organization_id=$1",
          [org],
        )
      ).rows[0],
    ).toEqual({ raw_data: {}, normalized_data: {} });
    expect(
      (
        await db.query("select id from public.limpax_history_receipts where organization_id=$1", [
          org,
        ])
      ).rows[0].id,
    ).toBe(first.receipt_id);
  });
  it("replay após anonimizar preserva recibo sem restaurar bruto", async () => {
    const first = await command();
    await redact();
    expect(await command()).toEqual({ ...first, reused: true });
    expect(
      (
        await db.query(
          "select raw_data from public.limpax_service_history where organization_id=$1",
          [org],
        )
      ).rows[0].raw_data,
    ).toEqual({});
  });
  it("recusa nova origem para pessoa anonimizada e reverte todo lote", async () => {
    await command();
    await redact();
    await db.query("savepoint negative");
    await expect(command("d".repeat(64))).rejects.toMatchObject({ code: "42501" });
    await db.query("rollback to savepoint negative");
    expect(
      (
        await db.query(
          "select count(*)::int n from public.import_batches where organization_id=$1",
          [org],
        )
      ).rows[0].n,
    ).toBe(1);
  });
  it("redação não alcança outra organização ou endereço de empresa", async () => {
    await command();
    await db.query(
      "insert into public.companies(id,organization_id,trade_name) values($1,$2,'Outra fictícia')",
      [contact, other],
    );
    await db.query(
      "insert into public.limpax_customer_locations(organization_id,company_id,address_original) values($1,$2,'Endereço empresarial fictício')",
      [other, contact],
    );
    await redact();
    expect(
      (
        await db.query(
          "select address_original,redacted_at from public.limpax_customer_locations where organization_id=$1",
          [other],
        )
      ).rows[0],
    ).toEqual({ address_original: "Endereço empresarial fictício", redacted_at: null });
  });
  it("rollback da anonimização restaura todas as cópias na mesma transação", async () => {
    await command();
    await db.query("savepoint redact");
    await redact();
    await db.query("rollback to savepoint redact");
    expect(
      (
        await db.query(
          "select notes_original,redacted_at from public.limpax_service_history where organization_id=$1",
          [org],
        )
      ).rows[0],
    ).toEqual({ notes_original: row.notes_original, redacted_at: null });
  });
  it("funções internas não podem ser chamadas pelos papéis da API", async () => {
    for (const role of ["anon", "authenticated", "service_role"]) {
      expect(
        (
          await db.query(
            "select has_function_privilege($1,'public.fn_limpax_history_redact_contact()','EXECUTE') allowed",
            [role],
          )
        ).rows[0].allowed,
      ).toBe(false);
      expect(
        (
          await db.query(
            "select has_function_privilege($1,'public.fn_limpax_history_guard_redacted_person()','EXECUTE') allowed",
            [role],
          )
        ).rows[0].allowed,
      ).toBe(false);
    }
  });
});
