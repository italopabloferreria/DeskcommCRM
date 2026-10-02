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
describe("bloco de gestão do histórico em banco descartável", () => {
  it("corrige dados correntes e incrementa versão preservando fonte original", async () => {
    const id = await prepare();
    const result = await manage(id, correction);
    expect(result.version).toBe(1);
    const current = (
      await db.query(
        "select revision,value_cents,notes_current,notes_original,raw_data from public.limpax_service_history where id=$1",
        [id],
      )
    ).rows[0];
    expect(current).toMatchObject({
      revision: 1,
      value_cents: "0",
      notes_current: patch.notes_current,
      notes_original: row.notes_original,
      raw_data: row.raw_data,
    });
  });
  it("replay reutiliza recibo sem repetir correção ou auditoria", async () => {
    const id = await prepare();
    const first = await manage(id, correction);
    expect(await manage(id, correction)).toEqual({ ...first, reused: true });
    expect(
      (
        await db.query(
          "select count(*)::int n from public.api_audit_log where organization_id=$1 and action='limpax.history.correct'",
          [org],
        )
      ).rows[0].n,
    ).toBe(1);
  });
  it("mesma chave com outro comando conflita sem efeito", async () => {
    const id = await prepare();
    await manage(id, correction);
    await denied(id, { ...correction, reason: "data_entry" }, "PT409");
    expect(
      (await db.query("select revision from public.limpax_service_history where id=$1", [id]))
        .rows[0].revision,
    ).toBe(1);
  });
  it("versão antiga não sobrescreve trabalho de outro operador", async () => {
    const id = await prepare();
    await manage(id, correction);
    await denied(id, { ...correction, request_id: contact }, "PT409");
  });
  it("vínculo de local de outra organização aborta comando/recibo/auditoria", async () => {
    const id = await prepare();
    await db.query(
      "insert into public.companies(id,organization_id,trade_name) values($1,$2,'Fictícia')",
      [contact, other],
    );
    await db.query(
      "insert into public.limpax_customer_locations(id,organization_id,company_id,address_original) values($1,$2,$3,'Outro')",
      [key, other, contact],
    );
    await denied(id, { ...correction, patch: { ...patch, location_id: key } }, "23514");
    expect(
      (
        await db.query(
          "select count(*)::int n from public.limpax_history_management_receipts where organization_id=$1",
          [org],
        )
      ).rows[0].n,
    ).toBe(0);
  });
  it("exclusão lógica preserva origem e impede correção/restauração", async () => {
    const id = await prepare();
    await manage(id, { action: "void", request_id: key, expected_version: 0, reason: "duplicate" });
    expect(
      (
        await db.query("select voided_at,raw_data from public.limpax_service_history where id=$1", [
          id,
        ])
      ).rows[0].raw_data,
    ).toEqual(row.raw_data);
    await denied(id, { ...correction, expected_version: 1, request_id: contact }, "42501");
  });
  it("manager corrige mas não exclui nem anonimiza", async () => {
    const id = await prepare();
    await db.query("update public.user_organizations set role='manager' where user_id=$1", [user]);
    await denied(
      id,
      { action: "void", request_id: key, expected_version: 0, reason: "duplicate" },
      "42501",
    );
    await denied(
      person,
      { action: "redact_person", request_id: key, confirm: true },
      "42501",
      "person",
    );
    expect((await manage(id, correction)).version).toBe(1);
  });
  it("pessoa sem contato tem conteúdo limpo e tombstone permanente", async () => {
    const id = await prepare();
    await manage(id, correction);
    await manage(person, { action: "redact_person", request_id: contact, confirm: true }, "person");
    const p = (
      await db.query("select full_name,email,notes from public.people where id=$1", [person])
    ).rows[0];
    expect(p.email).toBeNull();
    expect(p.notes).toBeNull();
    expect(p.full_name).toContain("Pessoa anonimizada");
    expect(
      (
        await db.query(
          "select notes_current,raw_data,redacted_at from public.limpax_service_history where id=$1",
          [id],
        )
      ).rows[0],
    ).toMatchObject({ notes_current: "", raw_data: {} });
    await db.query("savepoint restore");
    await expect(
      db.query("update public.people set email='restore@example.invalid' where id=$1", [person]),
    ).rejects.toMatchObject({ code: "42501" });
    await db.query("rollback to savepoint restore");
    await db.query("savepoint reimport");
    await expect(command("f".repeat(64))).rejects.toMatchObject({ code: "42501" });
    await db.query("rollback to savepoint reimport");
  });
  it("pessoa com contato ativo usa fluxo de contato existente sem apagar telefone compartilhado", async () => {
    const id = await prepare();
    await db.query(
      "insert into public.contacts(id,organization_id,person_id,name) values($1,$2,$3,'Fictício')",
      [contact, org, person],
    );
    await denied(
      person,
      { action: "redact_person", request_id: key, confirm: true },
      "PT409",
      "person",
    );
    expect(
      (await db.query("select raw_data from public.limpax_service_history where id=$1", [id]))
        .rows[0].raw_data,
    ).toEqual(row.raw_data);
  });
  it("replay da anonimização e origem velha não recriam PII", async () => {
    await prepare();
    const body = { action: "redact_person", request_id: key, confirm: true };
    const first = await manage(person, body, "person");
    expect(await manage(person, body, "person")).toEqual({ ...first, reused: true });
    expect((await command()).reused).toBe(true);
    expect(
      (
        await db.query(
          "select raw_data from public.limpax_service_history where organization_id=$1",
          [org],
        )
      ).rows[0].raw_data,
    ).toEqual({});
  });
  it("export privado da pessoa sem contato inclui cadastro, linhas, locais e notas correntes", async () => {
    const id = await prepare();
    await manage(id, correction);
    await login();
    const result = (
      await db.query("select public.fn_limpax_history_export_person($1,$2) data", [org, person])
    ).rows[0].data;
    await db.query("reset role");
    expect(result.scope).toBe("person_profile_and_history");
    expect(result.history.services[0].notes_current).toBe(patch.notes_current);
    expect(result.import_rows).toHaveLength(1);
    expect(result.history.locations).toHaveLength(1);
  });
  it("viewer não modifica e outra organização não exporta o titular", async () => {
    const id = await prepare();
    await db.query("update public.user_organizations set role='viewer' where user_id=$1", [user]);
    await denied(id, correction, "42501");
    await login();
    await db.query("savepoint foreign_export");
    await expect(
      db.query("select public.fn_limpax_history_export_person($1,$2)", [other, person]),
    ).rejects.toMatchObject({ code: "42501" });
    await db.query("rollback to savepoint foreign_export");
  });
  it("papéis da API não podem alterar/apagar recibos e tombstones diretamente", async () => {
    await prepare();
    for (const table of ["limpax_history_management_receipts", "limpax_history_subjects"])
      for (const role of ["anon", "authenticated", "service_role"])
        for (const privilege of ["INSERT", "UPDATE", "DELETE", "TRUNCATE"])
          expect(
            (
              await db.query("select has_table_privilege($1,$2,$3) allowed", [
                role,
                "public." + table,
                privilege,
              ])
            ).rows[0].allowed,
          ).toBe(false);
  });
});
