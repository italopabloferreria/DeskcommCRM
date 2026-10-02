/** Draft DB suite: execute explicitly ONLY against the disposable test-db harness.
 * Not part of unit tests, not proof until a real PostgreSQL run passes.
 */
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import pg from "pg";
if (
  !process.env.TEST_DB_CONTAINER ||
  !process.env.TEST_DB_TEMPLATE ||
  process.env.DESKCOMM_INVARIANTS_DB_RESET !== "1" ||
  !process.env.TEST_DB_PORT ||
  !/^\d+$/.test(process.env.TEST_DB_PORT)
)
  throw new Error("Use only the disposable database harness, never operational Supabase.");
const pool = new pg.Pool({
  connectionString: `postgresql://postgres:postgres@127.0.0.1:${process.env.TEST_DB_PORT}/postgres`,
  max: 1,
});
let db: pg.PoolClient;
const ORG = "7e000000-0000-4000-8000-000000000001",
  OTHER = "7e000000-0000-4000-8000-000000000002";
const COMPANY = "7e100000-0000-4000-8000-000000000001",
  FOREIGN = "7e100000-0000-4000-8000-000000000002";
const USER = "7e200000-0000-4000-8000-000000000001",
  LOCATION = "7e300000-0000-4000-8000-000000000001";
const BATCH = "7e400000-0000-4000-8000-000000000001",
  ROW = "7e500000-0000-4000-8000-000000000001";
const FOREIGN_LOCATION = "7e300000-0000-4000-8000-000000000002";
const FOREIGN_BATCH = "7e400000-0000-4000-8000-000000000002",
  FOREIGN_ROW = "7e500000-0000-4000-8000-000000000002";
async function rejectQuery(sql: string, params: unknown[], code: string) {
  await db.query("savepoint expected_failure");
  try {
    await expect(db.query(sql, params)).rejects.toMatchObject({ code });
  } finally {
    await db.query("rollback to savepoint expected_failure");
    await db.query("release savepoint expected_failure");
  }
}
const insertService = (
  company = COMPANY,
  index = 1,
  location: string | null = LOCATION,
  row = ROW,
) =>
  db.query(
    `
 insert into public.limpax_service_history(organization_id, company_id, location_id, import_row_id, source_sha256, source_data_row_index, raw_data, value_cents, decision_sha256)
 values($1,$2,$3,$4,repeat('a',64),$5,'{}'::jsonb,0,repeat('b',64))`,
    [ORG, company, location, row, index],
  );
beforeAll(async () => {
  db = await pool.connect();
  await db.query("begin");
  await db.query(readFileSync("supabase/drafts/limpax_history_provisioner.sql", "utf8"));
  expect(
    (await db.query("select to_regclass('public.limpax_service_history') t")).rows[0].t,
  ).toBeNull();
  await db.query("select public.fn_limpax_historico_provisionar()");
  await db.query("insert into auth.users(id,email) values($1,'history-test@example.invalid')", [
    USER,
  ]);
  await db.query(
    "insert into public.organizations(id,slug,legal_name,display_name) values($1,'draft-history-test','Fictício','Fictício'),($2,'draft-history-other','Outro fictício','Outro fictício')",
    [ORG, OTHER],
  );
  await db.query(
    "insert into public.user_organizations(user_id,organization_id,role,accepted_at) values($1,$2,'manager',now())",
    [USER, ORG],
  );
  await db.query(
    "insert into public.companies(id,organization_id,trade_name) values($1,$3,'Empresa fictícia'),($2,$4,'Outra fictícia')",
    [COMPANY, FOREIGN, ORG, OTHER],
  );
  await db.query(
    "insert into public.import_batches(id,organization_id,filename) values($1,$2,'synthetic.csv')",
    [BATCH, ORG],
  );
  await db.query(
    "insert into public.import_rows(id,organization_id,batch_id,row_number) values($1,$2,$3,1)",
    [ROW, ORG, BATCH],
  );
  await db.query(
    "insert into public.limpax_customer_locations(id,organization_id,company_id,address_original) values($1,$2,$3,'Rua fictícia')",
    [LOCATION, ORG, COMPANY],
  );

  await db.query(
    "insert into public.import_batches(id,organization_id,filename) values($1,$2,'other-synthetic.csv')",
    [FOREIGN_BATCH, OTHER],
  );
  await db.query(
    "insert into public.import_rows(id,organization_id,batch_id,row_number) values($1,$2,$3,1)",
    [FOREIGN_ROW, OTHER, FOREIGN_BATCH],
  );
  await db.query(
    "insert into public.limpax_customer_locations(id,organization_id,company_id,address_original) values($1,$2,$3,'Outro local fictício')",
    [FOREIGN_LOCATION, OTHER, FOREIGN],
  );
  await insertService();
  await db.query(
    "insert into public.limpax_service_history(organization_id,company_id,location_id,import_row_id,source_sha256,source_data_row_index,raw_data,decision_sha256) values($1,$2,$3,$4,repeat('c',64),1,'{}',repeat('d',64))",
    [OTHER, FOREIGN, FOREIGN_LOCATION, FOREIGN_ROW],
  );
}, 30000);
afterAll(async () => {
  if (db) {
    await db.query("rollback");
    db.release();
  }
  await pool.end();
});
describe("rascunho de armazenamento histórico no banco descartável", () => {
  it("reaplica o provisionador sem perder local", async () => {
    await db.query("select public.fn_limpax_historico_provisionar()");
    expect(
      (
        await db.query("select count(*)::int n from public.limpax_customer_locations where id=$1", [
          LOCATION,
        ])
      ).rows[0].n,
    ).toBe(1);
  });
  it("recusa cliente de outra organização mesmo com postgres", async () => {
    await rejectQuery(
      "insert into public.limpax_customer_locations(organization_id,company_id,address_original) values($1,$2,'Fictício')",
      [ORG, FOREIGN],
      "23514",
    );
  });
  it("recusa local e origem de outra organização", async () => {
    await rejectQuery(
      "insert into public.limpax_service_history(organization_id,company_id,location_id,import_row_id,source_sha256,source_data_row_index,raw_data,decision_sha256) values($1,$2,$3,$4,repeat('e',64),2,'{}',repeat('f',64))",
      [ORG, COMPANY, FOREIGN_LOCATION, ROW],
      "23514",
    );
    await rejectQuery(
      "insert into public.limpax_service_history(organization_id,company_id,import_row_id,source_sha256,source_data_row_index,raw_data,decision_sha256) values($1,$2,$3,repeat('e',64),2,'{}',repeat('f',64))",
      [ORG, COMPANY, FOREIGN_ROW],
      "23514",
    );
  });
  it("não permite invocar o provisionador pelo browser", async () => {
    for (const role of ["anon", "authenticated"])
      expect(
        (
          await db.query(
            "select has_function_privilege($1,'public.fn_limpax_historico_provisionar()','EXECUTE') allowed",
            [role],
          )
        ).rows[0].allowed,
      ).toBe(false);
  });
  it("guarda zero e ausência sem inventar horário", async () => {
    const result = (
      await db.query(
        "select value_cents::text,service_date,currency from public.limpax_service_history where import_row_id=$1",
        [ROW],
      )
    ).rows[0];
    expect(result).toEqual({ value_cents: "0", service_date: null, currency: null });
  });
  it("duplicar a mesma origem falha na unicidade, não é recibo de replay", async () => {
    await db.query("savepoint replay_test");
    try {
      await expect(insertService()).rejects.toMatchObject({ code: "23505" });
    } finally {
      await db.query("rollback to savepoint replay_test");
      await db.query("release savepoint replay_test");
    }
  });
  it("não concede escrita ou truncate ao browser nem alteração/descarte ao service role", async () => {
    for (const table of ["limpax_customer_locations", "limpax_service_history"]) {
      for (const role of ["anon", "authenticated"]) {
        for (const permission of ["INSERT", "UPDATE", "DELETE", "TRUNCATE"])
          expect(
            (
              await db.query("select has_table_privilege($1,$2,$3) allowed", [
                role,
                "public." + table,
                permission,
              ])
            ).rows[0].allowed,
          ).toBe(false);
      }
      for (const permission of ["UPDATE", "DELETE", "TRUNCATE"])
        expect(
          (
            await db.query("select has_table_privilege('service_role',$1,$2) allowed", [
              "public." + table,
              permission,
            ])
          ).rows[0].allowed,
        ).toBe(false);
    }
  });
  it("anônimo não lê; membro vê apenas a própria organização", async () => {
    expect(
      (
        await db.query(
          "select count(distinct organization_id)::int n from public.limpax_service_history",
        )
      ).rows[0].n,
    ).toBe(2);
    await db.query("set local role anon");
    try {
      await rejectQuery("select * from public.limpax_service_history", [], "42501");
    } finally {
      await db.query("reset role");
    }
    await db.query("set local role authenticated");
    await db.query("select set_config('request.jwt.claims',$1,true)", [
      JSON.stringify({ sub: USER, role: "authenticated" }),
    ]);
    try {
      expect(
        (await db.query("select distinct organization_id from public.limpax_service_history")).rows,
      ).toEqual([{ organization_id: ORG }]);
    } finally {
      await db.query("reset role");
    }
  });
});
