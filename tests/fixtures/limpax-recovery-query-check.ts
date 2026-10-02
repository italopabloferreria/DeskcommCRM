import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { compareRecovery, RECOVERY_QUERY } from "../../scripts/limpax-recovery-preflight";

// Synthetic, disposable CI database only. No URL, project credentials or real archive.
if (process.env.PGHOST !== "127.0.0.1" || process.env.PGDATABASE !== "limpax_recovery_fixture") {
  throw new Error("DISPOSABLE_LOCAL_FIXTURE_REQUIRED");
}
const env = { ...process.env, PGOPTIONS: "-c statement_timeout=15000 -c timezone=UTC", PGCONNECT_TIMEOUT: "5" };
const query = (sql: string) => {
  const r = spawnSync("psql", ["-X", "--no-password", "-qAt", "--set=ON_ERROR_STOP=1"], { input: sql, env, encoding: "utf8", timeout: 30000 });
  assert.equal(r.status, 0, "Synthetic PostgreSQL query failed");
  return r.stdout;
};
query(`
CREATE SCHEMA auth; CREATE SCHEMA storage; CREATE SCHEMA vault;
CREATE TABLE public.organizations (id integer PRIMARY KEY, name text NOT NULL);
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY fixture_read ON public.organizations FOR SELECT USING (true);
CREATE TABLE auth.users (id integer PRIMARY KEY);
CREATE TABLE storage.objects (id integer PRIMARY KEY);
CREATE TABLE vault.secrets (id integer PRIMARY KEY);
INSERT INTO public.organizations VALUES (1,'Synthetic organization');
INSERT INTO auth.users VALUES (1);
`);
const before: unknown = JSON.parse(query(RECOVERY_QUERY));
const equal: unknown = JSON.parse(query(RECOVERY_QUERY));
assert.equal(compareRecovery(before, equal, "bzretxzwnudtpxmoqjyv", "abcdefghijklmnopqrst").database_matches, true);
query("UPDATE public.organizations SET name='Changed synthetic organization' WHERE id=1;");
const changed: unknown = JSON.parse(query(RECOVERY_QUERY));
assert.equal(compareRecovery(before, changed, "bzretxzwnudtpxmoqjyv", "abcdefghijklmnopqrst").database_matches, false);
assert.equal(compareRecovery(before, equal, "bzretxzwnudtpxmoqjyv", "abcdefghijklmnopqrst").restore_proven, false);
assert.throws(() => query("BEGIN READ ONLY; UPDATE public.organizations SET name='Forbidden'; ROLLBACK;"));
process.stdout.write("PASS: repeatable snapshot, identical inventory, content change at constant row count, readonly rejection, no full-restore claim.\n");
