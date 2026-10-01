/* Prova offline do SQL com PGlite. Não abre rede, servidor nem Supabase real.
 * Uso: node scripts/verify-limpax-import-sql.mjs <caminho do pacote @electric-sql/pglite>
 * Reproduz DDL/RLS B2B da 0448 e um core mínimo. Não substitui teste do baseline
 * completo nem duas conexões PostgreSQL reais para concorrência.
 */
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
const loader = createRequire(import.meta.url);
const entry = loader.resolve(process.argv[2] || "@electric-sql/pglite");
const { PGlite } = await import(pathToFileURL(entry).href);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const migration = fs.readFileSync(
  path.join(root, "supabase/migrations/20261001060000_0495_importacao_b2b_atomica.sql"),
  "utf8",
);
const org = "11111111-1111-4111-8111-111111111111",
  other = "22222222-2222-4222-8222-222222222222";
const manager = "33333333-3333-4333-8333-333333333333",
  viewer = "44444444-4444-4444-8444-444444444444";
(async () => {
  const db = new PGlite();
  let passed = 0;
  const check = (label, fn) => {
    fn();
    passed++;
    process.stdout.write("PASS " + label + "\n");
  };
  try {
    await db.exec(`
 create role anon; create role authenticated; create role service_role;
 create schema auth;
 create table auth.users(id uuid primary key,email text);
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 grant usage on schema auth,public to authenticated,anon,service_role;
 create table public.organizations(id uuid primary key);
 create table public.user_organizations(user_id uuid,organization_id uuid,role text);
 create function public.fn_user_org_ids() returns setof uuid language sql security definer stable set search_path='' as $$ select organization_id from public.user_organizations where user_id=auth.uid() $$;
 create function public.fn_role_at_least(p_org uuid,p_min text) returns boolean language sql security definer stable set search_path='' as $$ select coalesce((select array_position(array['viewer','agent','manager','admin'],role)>=array_position(array['viewer','agent','manager','admin'],p_min) from public.user_organizations where user_id=auth.uid() and organization_id=p_org),false) $$;
 create function public.fn_set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at=now();return new;end $$;
 create table public.contacts(id uuid primary key default gen_random_uuid(),organization_id uuid references public.organizations(id),name text,display_name text,phone_number text,email text,source text,source_metadata jsonb,created_by_user_id uuid references auth.users(id),is_merged_into uuid,kind text default 'person',unique(organization_id,phone_number));
 alter table public.contacts enable row level security;
 create policy fixture_contact_read on public.contacts for select to authenticated using(organization_id in(select public.fn_user_org_ids()));
 create policy fixture_contact_write on public.contacts for all to authenticated using(public.fn_role_at_least(organization_id,'manager')) with check(public.fn_role_at_least(organization_id,'manager'));
 grant select,insert,update,delete on public.contacts to authenticated;
 insert into public.organizations values ('${org}'),('${other}');
 insert into auth.users values ('${manager}','manager@example.invalid'),('${viewer}','viewer@example.invalid');
 insert into public.user_organizations values ('${manager}','${org}','manager'),('${viewer}','${org}','viewer');
 `);
    await db.exec(
      fs.readFileSync(
        path.join(root, "supabase/migrations/20260928132000_0448_empresas_pessoas_importacao.sql"),
        "utf8",
      ),
    );
    await db.exec(migration);
    const login = async (user, role = "authenticated") => {
      await db.exec("reset role");
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [user]);
      await db.exec("set role " + role);
    };
    const row = (company, person, phone, email = "person@example.invalid") => ({
      raw_data: { Empresa: company, Pessoa: person },
      normalized_data: {
        company_name: company,
        person_name: person,
        normalized_name: person.toLowerCase(),
        phone_e164: phone,
        phone_variants: phone ? [phone] : [],
        email,
      },
    });
    const call = async (rows, tenant = org) =>
      (
        await db.query(
          "select public.fn_import_companies_people_atomic($1,$2,$3::jsonb,$4::jsonb) as result",
          [
            tenant,
            "demo.csv",
            JSON.stringify({ company_name: "Empresa", person_name: "Pessoa" }),
            JSON.stringify(rows),
          ],
        )
      ).rows[0].result;
    const count = async (table) => {
      await db.exec("reset role");
      return Number((await db.query("select count(*) as n from public." + table)).rows[0].n);
    };
    const base = [row("Empresa fictícia", "Pessoa teste", "+5511999990000")];
    await login(manager);
    const first = await call(base);
    check("primeira importação confirma 1 linha", () => assert.equal(first.successful_rows, 1));
    await login(manager);
    const replay = await call(base);
    check("replay usa mesmo lote", () => {
      assert.equal(replay.reused, true);
      assert.equal(replay.batch_id, first.batch_id);
    });
    check("replay não duplica empresa", () => {});
    assert.equal(await count("companies"), 1);
    await login(manager);
    const different = await call([
      base[0],
      row("Empresa fictícia", "Pessoa teste", "+5511988880000"),
    ]);
    check("novo lote reutiliza empresa e pessoa", () => assert.equal(different.successful_rows, 2));
    assert.equal(await count("companies"), 1);
    assert.equal(await count("people"), 1);
    assert.equal(await count("contacts"), 2);
    passed++;
    await login(manager);
    const conflict = await call([row("Outra empresa", "Outra pessoa", "+5511999990000")]);
    check("telefone conflitante não cria cadastro", () => assert.equal(conflict.conflict_rows, 1));
    assert.equal(await count("companies"), 1);
    await db.exec(
      "alter table public.people add constraint fixture_reject_email check(email is distinct from 'blocked@example.invalid')",
    );
    await login(manager);
    const failed = await call([
      row("Empresa que deve sumir", "Nova pessoa", null, "blocked@example.invalid"),
    ]);
    check("erro após criação de empresa reverte linha inteira", () =>
      assert.equal(failed.failed_rows, 1),
    );
    assert.equal(await count("companies"), 1);
    assert.equal(await count("people"), 1);
    await login(viewer);
    await assert.rejects(
      () => call([row("Viewer", "Pessoa", null)]),
      (err) => err.code === "42501",
    );
    passed++;
    process.stdout.write("PASS viewer recusado\n");
    await login(manager);
    await assert.rejects(
      () => call(base, other),
      (err) => err.code === "42501",
    );
    passed++;
    process.stdout.write("PASS outra organização recusada\n");
    await login("", "anon");
    await assert.rejects(
      () => call(base),
      (err) => err.code === "42501",
    );
    passed++;
    process.stdout.write("PASS anônimo recusado\n");
    const batchesBefore = await count("import_batches");
    await db.exec(
      `create function public.fixture_fatal() returns trigger language plpgsql as $$ begin if new.normalized_data->>'company_name'='FATAL' then raise exception using errcode='XX000',message='fixture fatal';end if;return new;end $$;create trigger fixture_fatal before insert on public.import_rows for each row execute function public.fixture_fatal();`,
    );
    await login(manager);
    await assert.rejects(
      () => call([row("FATAL", "Pessoa fatal", null)]),
      (err) => err.code === "XX000",
    );
    check("falha inesperada reverte lote e cadastros", () => {});
    assert.equal(await count("companies"), 1);
    assert.equal(await count("import_batches"), batchesBefore);
    await db.exec(migration);
    check("migração reaplicável preserva dados", () => {});
    assert.equal(await count("contacts"), 2);
    const baseline = fs.readFileSync(path.join(root, "supabase/baseline.sql"), "utf8");
    check("baseline inclui migração antes da varredura", () => {
      assert(baseline.includes(migration));
      assert(baseline.indexOf(migration) < baseline.indexOf("-- ---- VARREDURA anon:"));
    });
    process.stdout.write(
      "RESULT " +
        passed +
        " verificações SQL offline passaram; concorrência entre conexões e baseline completo ainda pendentes.\n",
    );
  } finally {
    await db.close();
  }
})().catch((err) => {
  process.stderr.write(String(err.stack || err) + "\n");
  process.exitCode = 1;
});
