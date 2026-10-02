/** Canonical baseline, disposable DB and synthetic data only. No draft SQL setup. */
import { beforeAll, beforeEach, afterEach, afterAll, expect, it } from "vitest";
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
const org = "73000000-0000-4000-8000-000000000001",
  other = "73000000-0000-4000-8000-000000000002",
  user = "73100000-0000-4000-8000-000000000001",
  person = "73200000-0000-4000-8000-000000000001",
  key = "73300000-0000-4000-8000-000000000001";
const row = {
  data_row_index: 1,
  row_kind: "service",
  company_id: null,
  person_id: person,
  location_id: null,
  create_address: "Rua fictícia",
  raw_data: { headers: ["Nome", "Extra"], cells: ["Cliente fictício", "Integral"] },
  original_reference: null,
  service_date: "2024-01-01",
  value_cents: 0,
  currency: null,
  notes_original: "Serviço fictício",
};
async function login() {
  await db.query("set local role authenticated");
  await db.query("select set_config('request.jwt.claims',$1,true)", [
    JSON.stringify({ sub: user, role: "authenticated", aal: "aal2" }),
  ]);
}
async function imported(hash = "d".repeat(64)) {
  await login();
  const res = await db.query(
    "select public.fn_limpax_history_import_atomic($1,$2,'synthetic.csv',$3::jsonb) receipt",
    [org, hash, JSON.stringify([row])],
  );
  await db.query("reset role");
  return res.rows[0].receipt;
}
async function reverse(batch: string, request = key, scope = org) {
  await login();
  const res = await db.query(
    "select public.fn_limpax_history_reverse_batch($1,$2,$3::jsonb) receipt",
    [scope, batch, JSON.stringify({ request_id: request, confirm: true })],
  );
  await db.query("reset role");
  return res.rows[0].receipt;
}
async function rejected(fn: () => Promise<unknown>, code: string) {
  await db.query("savepoint expected");
  try {
    await expect(fn()).rejects.toMatchObject({ code });
  } finally {
    await db.query("rollback to savepoint expected");
    await db.query("reset role");
    await db.query("release savepoint expected");
  }
}
beforeAll(async () => {
  db = await pool.connect();
  const pre = (await db.query("select to_regclass('public.limpax_service_history') t")).rows[0];
  expect(pre.t).toBeNull();
  const triggers = (
    await db.query(
      "select count(*)::int n from pg_trigger where tgname in('limpax_person_no_restore','trg_limpax_history_redact')",
    )
  ).rows[0];
  expect(triggers.n).toBe(0);
  await db.query("select public.fn_limpax_historico_provisionar()");
  await db.query("select public.fn_limpax_historico_provisionar()");
}, 30000);
beforeEach(async () => {
  await db.query("begin");
  await db.query("insert into auth.users(id,email) values($1,'canonical@example.invalid')", [user]);
  await db.query(
    "insert into public.organizations(id,slug,legal_name,display_name) values($1,'canonical','Fictício','Fictício'),($2,'canonical-other','Outro','Outro')",
    [org, other],
  );
  await db.query(
    "insert into public.user_organizations(user_id,organization_id,role,accepted_at) values($1,$2,'admin',now())",
    [user, org],
  );
  await db.query(
    "insert into public.people(id,organization_id,full_name) values($1,$2,'Pessoa fictícia')",
    [person, org],
  );
});
afterEach(async () => {
  await db.query("rollback");
});
afterAll(async () => {
  db.release();
  await pool.end();
});
it("baseline distribui funções sem tabelas e provisiona/reaplica o módulo explicitamente", async () => {
  const priv = (
    await db.query(
      "select has_function_privilege('anon','public.fn_limpax_historico_provisionar()','EXECUTE') a, has_function_privilege('authenticated','public.fn_limpax_historico_provisionar()','EXECUTE') b,has_function_privilege('service_role','public.fn_limpax_historico_provisionar()','EXECUTE') c",
    )
  ).rows[0];
  expect(priv).toEqual({ a: false, b: false, c: true });
  const direct = (
    await db.query(
      "select has_table_privilege('authenticated','public.limpax_history_receipts','INSERT') a,has_table_privilege('service_role','public.limpax_history_management_receipts','UPDATE') b",
    )
  ).rows[0];
  expect(direct).toEqual({ a: false, b: false });
});
it("reverte serviços logicamente sem apagar pessoa, local, linhas ou recibo", async () => {
  const batch = await imported();
  const result = await reverse(batch.batch_id);
  expect(result).toMatchObject({ batch_id: batch.batch_id, voided_services: 1, reused: false });
  const service = (
    await db.query(
      "select revision,voided_at,raw_data,value_cents from public.limpax_service_history where organization_id=$1",
      [org],
    )
  ).rows[0];
  expect(service.revision).toBe(1);
  expect(service.voided_at).not.toBeNull();
  expect(service.raw_data).toEqual(row.raw_data);
  expect(service.value_cents).toBe("0");
  for (const table of [
    "people",
    "limpax_customer_locations",
    "import_rows",
    "limpax_history_receipts",
  ]) {
    expect(
      (
        await db.query(
          "select count(*)::int n from public." + table + " where organization_id=$1",
          [org],
        )
      ).rows[0].n,
    ).toBe(1);
  }
});
it("replay da reversão retorna mesmo resultado e uma auditoria", async () => {
  const b = await imported(),
    first = await reverse(b.batch_id),
    second = await reverse(b.batch_id);
  expect(second).toEqual({ ...first, reused: true });
  const newKey = await reverse(b.batch_id, "73300000-0000-4000-8000-000000000002");
  expect(newKey.reused).toBe(true);
  expect(
    (
      await db.query(
        "select count(*)::int n from public.api_audit_log where organization_id=$1 and action='limpax.history.batch_reversed'",
        [org],
      )
    ).rows[0].n,
  ).toBe(1);
});
it("reenvio do arquivo revertido não restaura serviço e devolve reversed_at", async () => {
  const b = await imported();
  const rev = await reverse(b.batch_id),
    again = await imported();
  expect(again).toMatchObject({ ...b, reused: true, reversed_at: rev.reversed_at });
  expect(
    (
      await db.query(
        "select count(*)::int n from public.limpax_service_history where organization_id=$1 and voided_at is null",
        [org],
      )
    ).rows[0].n,
  ).toBe(0);
});
it("correção posterior recusa reversão integral preservando o serviço corrigido", async () => {
  const b = await imported();
  await db.query(
    "update public.limpax_service_history set revision=1,notes_current='Correção fictícia' where organization_id=$1",
    [org],
  );
  await rejected(() => reverse(b.batch_id), "PT409");
  expect(
    (
      await db.query(
        "select notes_current,voided_at from public.limpax_service_history where organization_id=$1",
        [org],
      )
    ).rows[0],
  ).toEqual({ notes_current: "Correção fictícia", voided_at: null });
});
it("manager não reverte e org alheia não revela o lote", async () => {
  const b = await imported();
  await db.query("update public.user_organizations set role='manager' where user_id=$1", [user]);
  await rejected(() => reverse(b.batch_id), "42501");
  await db.query("update public.user_organizations set role='admin' where user_id=$1", [user]);
  await db.query(
    "insert into public.user_organizations(user_id,organization_id,role,accepted_at) values($1,$2,'admin',now())",
    [user, other],
  );
  await rejected(() => reverse(b.batch_id, key, other), "P0002");
});
it("revogação e convite não aceito recusam o comando", async () => {
  const b = await imported();
  await db.query("update public.user_organizations set revoked_at=now() where user_id=$1", [user]);
  await rejected(() => reverse(b.batch_id), "42501");
  await db.query(
    "update public.user_organizations set revoked_at=null,accepted_at=null where user_id=$1",
    [user],
  );
  await rejected(() => reverse(b.batch_id), "42501");
});
it("mesma chave para outro lote é conflito sem efeito no segundo", async () => {
  const a = await imported(),
    b = await imported("e".repeat(64));
  await reverse(a.batch_id);
  await rejected(() => reverse(b.batch_id), "PT409");
  expect(
    (
      await db.query("select reversed_at from public.limpax_history_receipts where batch_id=$1", [
        b.batch_id,
      ])
    ).rows[0].reversed_at,
  ).toBeNull();
});
it("falha na última auditoria desfaz serviços e recibos da reversão", async () => {
  const b = await imported();
  await db.query(
    "create function public.synthetic_fail_reverse_audit() returns trigger language plpgsql as $$begin if new.action='limpax.history.batch_reversed' then raise exception 'synthetic_last_effect';end if;return new;end;$$;create trigger synthetic_reverse_fail before insert on public.api_audit_log for each row execute function public.synthetic_fail_reverse_audit()",
  );
  await rejected(() => reverse(b.batch_id), "P0001");
  expect(
    (
      await db.query(
        "select voided_at,revision from public.limpax_service_history where organization_id=$1",
        [org],
      )
    ).rows[0],
  ).toEqual({ voided_at: null, revision: 0 });
  expect(
    (
      await db.query("select reversed_at from public.limpax_history_receipts where batch_id=$1", [
        b.batch_id,
      ])
    ).rows[0].reversed_at,
  ).toBeNull();
  expect(
    (
      await db.query(
        "select count(*)::int n from public.limpax_history_management_receipts where organization_id=$1",
        [org],
      )
    ).rows[0].n,
  ).toBe(0);
});
