/** Unexecuted draft proof. Existing harness creates/destroys a disposable DB.
 * Synthetic fixtures committed only inside that DB; each test rolls back all effects.
 */
import { readFileSync } from "node:fs";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import pg from "pg";
if (
  !process.env.TEST_DB_CONTAINER ||
  !process.env.TEST_DB_TEMPLATE ||
  process.env.DESKCOMM_INVARIANTS_DB_RESET !== "1" ||
  !process.env.TEST_DB_PORT ||
  !/^\d+$/.test(process.env.TEST_DB_PORT)
)
  throw new Error("Disposable test:db harness required. Never operational Supabase.");
const pool = new pg.Pool({
  connectionString:
    "postgresql://postgres:postgres@127.0.0.1:" + process.env.TEST_DB_PORT + "/postgres",
  max: 2,
});
let db: pg.PoolClient;
const org = "8e000000-0000-4000-8000-000000000001",
  other = "8e000000-0000-4000-8000-000000000002";
const user = "8e100000-0000-4000-8000-000000000001",
  company = "8e200000-0000-4000-8000-000000000001",
  foreign = "8e200000-0000-4000-8000-000000000002";
const source = "a".repeat(64);
const row = {
  data_row_index: 1,
  row_kind: "service",
  company_id: company,
  person_id: null,
  location_id: null,
  create_address: "Rua fictícia",
  raw_data: { headers: ["Nome", "Valor"], cells: ["Fictício", "0"] },
  original_reference: null,
  service_date: null,
  value_cents: 0,
  currency: null,
  notes_original: "",
};
async function login(client: pg.PoolClient) {
  await client.query("set local role authenticated");
  await client.query("select set_config('request.jwt.claims',$1,true)", [
    JSON.stringify({ sub: user, role: "authenticated" }),
  ]);
}
async function command(rows: unknown[] = [row], hash = source, client = db) {
  return (
    await client.query(
      "select public.fn_limpax_history_import_atomic($1,$2,$3,$4::jsonb) receipt",
      [org, hash, "synthetic.csv", JSON.stringify(rows)],
    )
  ).rows[0].receipt;
}
async function reject(rows: unknown[], code: string, hash = source) {
  await db.query("savepoint negative");
  try {
    await expect(command(rows, hash)).rejects.toMatchObject({ code });
  } finally {
    await db.query("rollback to savepoint negative");
    await db.query("release savepoint negative");
  }
}
async function count(table: string) {
  // Static allowlist; never interpolate external table identifiers.
  if (
    ![
      "limpax_service_history",
      "limpax_customer_locations",
      "limpax_history_receipts",
      "import_batches",
      "import_rows",
      "api_audit_log",
    ].includes(table)
  )
    throw new Error("Invalid test table");
  // Audit RLS permits admin only. Observe effects as the disposable DB owner;
  // the import itself still executes as the real manager.
  if (table === "api_audit_log") {
    await db.query("reset role");
    try {
      return (
        await db.query(
          "select count(*)::int n from public.api_audit_log where organization_id=$1",
          [org],
        )
      ).rows[0].n;
    } finally {
      await db.query("set local role authenticated");
    }
  }
  return (
    await db.query("select count(*)::int n from public." + table + " where organization_id=$1", [
      org,
    ])
  ).rows[0].n;
}
beforeAll(async () => {
  db = await pool.connect();
  await db.query(readFileSync("supabase/drafts/limpax_history_provisioner.sql", "utf8"));
  await db.query("select public.fn_limpax_historico_provisionar()");
  await db.query(readFileSync("supabase/drafts/limpax_history_atomic.sql", "utf8"));
  await db.query("insert into auth.users(id,email) values($1,'atomic-test@example.invalid')", [
    user,
  ]);
  await db.query(
    "insert into public.organizations(id,slug,legal_name,display_name) values($1,'atomic-draft','Fictício','Fictício'),($2,'atomic-other','Outro fictício','Outro fictício')",
    [org, other],
  );
  await db.query(
    "insert into public.user_organizations(user_id,organization_id,role,accepted_at) values($1,$2,'manager',now())",
    [user, org],
  );
  await db.query(
    "insert into public.companies(id,organization_id,trade_name) values($1,$3,'Fictício'),($2,$4,'Outro fictício')",
    [company, foreign, org, other],
  );
}, 30000);
beforeEach(async () => {
  await db.query("begin");
  await login(db);
});
afterEach(async () => {
  await db.query("rollback");
});
afterAll(async () => {
  if (db) db.release();
  await pool.end();
});
describe("rascunho de lote histórico atômico", () => {
  it("grava origem, zero e recibo sem criar moeda ou horário", async () => {
    const receipt = await command();
    expect(receipt).toMatchObject({
      total_rows: 1,
      service_rows: 1,
      locations_created: 1,
      auxiliary_rows: 0,
      reused: false,
    });
    expect(await count("import_rows")).toBe(1);
    expect(
      (
        await db.query(
          "select value_cents::text,service_date,currency,raw_data from public.limpax_service_history where organization_id=$1",
          [org],
        )
      ).rows[0],
    ).toEqual({ value_cents: "0", service_date: null, currency: null, raw_data: row.raw_data });
  });
  it("replay devolve o mesmo recibo e não duplica efeitos nem auditoria", async () => {
    const first = await command(),
      second = await command();
    expect(second).toEqual({ ...first, reused: true });
    for (const table of [
      "limpax_service_history",
      "limpax_customer_locations",
      "limpax_history_receipts",
      "import_batches",
      "api_audit_log",
    ])
      expect(await count(table)).toBe(1);
    await db.query("reset role");
    const metadata = (
      await db.query("select metadata from public.api_audit_log where organization_id=$1", [org])
    ).rows[0].metadata;
    await db.query("set local role authenticated");
    expect(metadata).toEqual({
      receipt_id: first.receipt_id,
      total_rows: 1,
      service_rows: 1,
      locations_created: 1,
      auxiliary_rows: 0,
    });
  });
  it("mesma origem com decisão diferente gera conflito sem mudar o histórico", async () => {
    await command();
    await reject([{ ...row, notes_original: "Outra decisão" }], "P0001");
    expect(await count("limpax_service_history")).toBe(1);
  });
  it("falha na última linha desfaz lote, locais, serviços e recibo", async () => {
    await reject([row, { ...row, data_row_index: 2, company_id: foreign }], "23514");
    for (const table of [
      "import_batches",
      "import_rows",
      "limpax_customer_locations",
      "limpax_service_history",
      "limpax_history_receipts",
      "api_audit_log",
    ])
      expect(await count(table)).toBe(0);
  });
  it("preserva linha auxiliar e local sem fabricar atendimento", async () => {
    const receipt = await command([
      { ...row, row_kind: "location_only", value_cents: null },
      {
        ...row,
        data_row_index: 2,
        row_kind: "auxiliary",
        company_id: null,
        create_address: null,
        value_cents: null,
      },
    ]);
    expect(receipt).toMatchObject({
      total_rows: 2,
      service_rows: 0,
      locations_created: 1,
      auxiliary_rows: 1,
    });
    expect(await count("import_rows")).toBe(2);
  });
  it("origens distintas conservam dois atendimentos iguais", async () => {
    await command();
    await command([row], "b".repeat(64));
    expect(await count("limpax_service_history")).toBe(2);
  });
  it("recusa campos extras, índice fora de ordem e valor fracionário", async () => {
    await reject([{ ...row, organization_id: other }], "22023");
    await reject([{ ...row, data_row_index: 2 }], "22023");
    await reject([{ ...row, value_cents: 0.5 }], "22023");
  });
  it("recusa membro sem papel manager mesmo pela função SQL", async () => {
    await db.query("reset role");
    await db.query(
      "update public.user_organizations set role='viewer' where user_id=$1 and organization_id=$2",
      [user, org],
    );
    await login(db);
    await reject([row], "42501");
  });
  it("não permite gravar ou apagar recibo diretamente pelo browser/service role", async () => {
    for (const role of ["anon", "authenticated", "service_role"])
      for (const permission of ["INSERT", "UPDATE", "DELETE", "TRUNCATE"])
        expect(
          (
            await db.query(
              "select has_table_privilege($1,'public.limpax_history_receipts',$2) allowed",
              [role, permission],
            )
          ).rows[0].allowed,
        ).toBe(false);
    expect(
      (
        await db.query(
          "select has_function_privilege('anon','public.fn_limpax_history_import_atomic(uuid,text,text,jsonb)','EXECUTE') allowed",
        )
      ).rows[0].allowed,
    ).toBe(false);
  });
  it("segunda conexão recebe busy enquanto a primeira mantém o lote aberto", async () => {
    await command();
    const second = await pool.connect();
    try {
      await second.query("begin");
      await login(second);
      await expect(command([row], source, second)).rejects.toMatchObject({ code: "55006" });
    } finally {
      await second.query("rollback");
      second.release();
    }
    expect(await count("limpax_service_history")).toBe(1);
  });
});
