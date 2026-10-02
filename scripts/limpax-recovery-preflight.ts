import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, realpathSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const projectRef = z.string().regex(/^[a-z]{20}$/);
const connectionSchema = z.strictObject({
  host: z.string(), port: z.literal(5432), user: z.string(),
  password: z.string().min(1).max(1024), database: z.literal("postgres"),
});
type Connection = z.infer<typeof connectionSchema>;
const inventorySchema = z.strictObject({
  version: z.string().regex(/^\d+\.\d+(?:\.\d+)?(?: [^\r\n]{1,100})?$/),
  role: z.literal("postgres"), read_only: z.literal(true),
  extensions: z.array(z.strictObject({ name: z.string(), version: z.string() })).min(1),
  tables: z.array(z.strictObject({
    schema: z.enum(["public", "auth", "storage", "vault"]), name: z.string(),
    rows: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER), rls: z.boolean(),
    fingerprint: z.string().regex(/^[a-f0-9]{32}$/),
    data_sha256: z.string().regex(/^[a-f0-9]{64}$/),
  })).min(1).max(2000),
  policies: z.number().int().nonnegative(),
  catalog_fingerprint: z.string().regex(/^[a-f0-9]{32}$/),
  storage_objects: z.number().int().nonnegative(), vault_secrets: z.number().int().nonnegative(),
});

export function recoveryConnection(value: unknown, expectedProject: string): Connection {
  projectRef.parse(expectedProject);
  const c = connectionSchema.parse(value);
  const pooler = /^[a-z0-9-]+\.pooler\.supabase\.com$/.test(c.host) && c.user === `postgres.${expectedProject}`;
  const direct = c.host === `db.${expectedProject}.supabase.co` && c.user === "postgres";
  if (!pooler && !direct) throw new Error("CONNECTION_PROJECT_MISMATCH");
  return c;
}

export function recoveryEnvironment(c: Connection, ca: string, inherited: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...inherited };
  for (const key of Object.keys(env)) if (key.toUpperCase().startsWith("PG")) delete env[key];
  return { ...env, PGHOST: c.host, PGPORT: String(c.port), PGUSER: c.user, PGPASSWORD: c.password,
    PGDATABASE: c.database, PGSSLMODE: "verify-full", PGSSLROOTCERT: ca, PGCONNECT_TIMEOUT: "15",
    PGOPTIONS: "-c default_transaction_read_only=on -c statement_timeout=45000 -c timezone=UTC -c row_security=off" };
}

export function inspectArchive(value: unknown, toc: string, sha256: string, size: number) {
  const receipt = z.object({ project: projectRef, sha256: z.string().regex(/^[a-f0-9]{64}$/), size: z.number().int().positive(),
    contents: z.object({ table_data: z.strictObject({ public: z.number().int().positive(), auth: z.number().int().positive(), storage: z.number().int().positive() }),
      policy_entries: z.number().int().nonnegative(), acl_entries: z.number().int().nonnegative() }) }).parse(value);
  if (receipt.sha256 !== sha256 || receipt.size !== size) throw new Error("ARCHIVE_CHANGED");
  const tables = { public: 0, auth: 0, storage: 0 };
  let policies = 0, acl = 0;
  for (const line of toc.split(/\r?\n/)) {
    if (!/^\d+; \d+ \d+ /.test(line)) continue;
    const table = line.match(/^\d+; \d+ \d+ TABLE DATA (public|auth|storage) /);
    if (table) tables[table[1] as keyof typeof tables]++;
    if (/^\d+; \d+ \d+ POLICY /.test(line)) policies++;
    if (/^\d+; \d+ \d+ (?:DEFAULT )?ACL /.test(line)) acl++;
  }
  for (const key of Object.keys(tables) as (keyof typeof tables)[]) {
    if (tables[key] !== receipt.contents.table_data[key]) throw new Error("ARCHIVE_TABLE_COVERAGE_MISMATCH");
  }
  if (policies !== receipt.contents.policy_entries || acl !== receipt.contents.acl_entries) throw new Error("ARCHIVE_ACCESS_COVERAGE_MISMATCH");
  return { project: receipt.project, sha256, size, tables, policies, acl };
}

export function compareRecovery(sourceValue: unknown, targetValue: unknown, sourceRef: string, targetRef: string) {
  projectRef.parse(sourceRef); projectRef.parse(targetRef);
  if (sourceRef === targetRef || targetRef === "lkamarbpjqlibxlmcico") throw new Error("ACTIVE_OR_LEGACY_TARGET_FORBIDDEN");
  const source = inventorySchema.parse(sourceValue), target = inventorySchema.parse(targetValue);
  const differences: string[] = [];
  if (source.version.split(".")[0] !== target.version.split(".")[0]) differences.push("postgres_major");
  for (const key of ["extensions", "tables"] as const) {
    const sort = (items: typeof source[typeof key]) => [...items].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
    if (JSON.stringify(sort(source[key])) !== JSON.stringify(sort(target[key]))) differences.push(key);
  }
  for (const key of ["policies", "catalog_fingerprint", "storage_objects", "vault_secrets"] as const) {
    if (source[key] !== target[key]) differences.push(key);
  }
  if (source.vault_secrets > 0) differences.push("vault_root_key_requires_separate_proof");
  if (source.storage_objects > 0) differences.push("storage_binaries_require_separate_proof");
  return { database_matches: differences.length === 0, differences,
    restore_proven: false, auth_login_verified: false,
    note: "Database comparison alone does not verify Auth configuration/login, external encryption keys or file/WAHA recovery." };
}

export function privateOutputPath(output: string, checkout: string, input: string) {
  const resolved = path.resolve(output), root = path.resolve(checkout);
  const relative = path.relative(root, resolved);
  if ((!relative.startsWith(".." + path.sep) && !path.isAbsolute(relative)) || resolved === path.resolve(input)) {
    throw new Error("PRIVATE_OUTPUT_LOCATION_FORBIDDEN");
  }
  return resolved;
}

// No customer fields or SQL definitions leave the DB: only counts and structural hashes.
export const RECOVERY_QUERY = `BEGIN READ ONLY;
SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;
SELECT json_build_object(
 'version',current_setting('server_version'),'role',current_user,
 'read_only',current_setting('transaction_read_only')='on',
 'extensions',(SELECT json_agg(json_build_object('name',extname,'version',extversion) ORDER BY extname) FROM pg_extension),
 'tables',(SELECT json_agg(json_build_object('schema',n.nspname,'name',c.relname,'rls',c.relrowsecurity,
 'rows',(xpath('/row/n/text()',query_to_xml(format('select count(*) as n from %I.%I',n.nspname,c.relname),false,true,'')))[1]::text::bigint,
 'data_sha256',(xpath('/row/d/text()',query_to_xml(format('select encode(sha256(convert_to(coalesce(string_agg(h,''|'' order by h collate "C"),''''),''UTF8'')),''hex'') as d from (select encode(sha256(convert_to(to_jsonb(t)::text,''UTF8'')),''hex'') as h from %I.%I t) hashes',n.nspname,c.relname),false,true,'')))[1]::text,
 'fingerprint',md5(concat_ws('|',c.relforcerowsecurity::text,c.relacl::text,
 (SELECT string_agg(concat_ws(':',a.attnum,a.attname,format_type(a.atttypid,a.atttypmod),a.attnotnull,pg_get_expr(d.adbin,d.adrelid)),E'\\n' ORDER BY a.attnum) FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped),
 (SELECT string_agg(pg_get_constraintdef(k.oid),E'\\n' ORDER BY k.conname) FROM pg_constraint k WHERE k.conrelid=c.oid),
 (SELECT string_agg(pg_get_indexdef(i.indexrelid),E'\\n' ORDER BY pg_get_indexdef(i.indexrelid)) FROM pg_index i WHERE i.indrelid=c.oid),
 (SELECT string_agg(pg_get_triggerdef(t.oid),E'\\n' ORDER BY t.tgname) FROM pg_trigger t WHERE t.tgrelid=c.oid AND NOT t.tgisinternal)))) ORDER BY n.nspname,c.relname)
 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('public','auth','storage','vault') AND c.relkind='r'),
 'policies',(SELECT count(*) FROM pg_policies WHERE schemaname IN ('public','auth','storage')),
 'catalog_fingerprint',md5(concat_ws('|',
 (SELECT string_agg(concat_ws(':',schemaname,tablename,policyname,permissive,roles::text,cmd,qual,with_check),E'\\n' ORDER BY schemaname,tablename,policyname) FROM pg_policies WHERE schemaname IN ('public','auth','storage')),
 (SELECT string_agg(concat_ws(':',n.nspname,p.proname,pg_get_functiondef(p.oid),p.proacl::text),E'\\n' ORDER BY n.nspname,p.proname,pg_get_function_identity_arguments(p.oid)) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname IN ('public','auth','storage') AND p.prokind IN ('f','p')),
 (SELECT string_agg(concat_ws(':',r.rolname,n.nspname,d.defaclobjtype,d.defaclacl::text),E'\\n' ORDER BY r.rolname,n.nspname,d.defaclobjtype) FROM pg_default_acl d JOIN pg_roles r ON r.oid=d.defaclrole LEFT JOIN pg_namespace n ON n.oid=d.defaclnamespace),
 (SELECT string_agg(concat_ws(':',n.nspname,n.nspacl::text),E'\\n' ORDER BY n.nspname) FROM pg_namespace n WHERE n.nspname IN ('public','auth','storage','vault')))),
 'storage_objects',(SELECT count(*) FROM storage.objects),
 'vault_secrets',(SELECT count(*) FROM vault.secrets));
ROLLBACK;`;

function jsonFile(file: string) { return JSON.parse(readFileSync(file, "utf8").replace(/^\uFEFF/, "")) as unknown; }
function tool(dir: string, name: string) {
  const executable = path.join(dir, name + (process.platform === "win32" ? ".exe" : ""));
  if (!existsSync(executable)) throw new Error("POSTGRES_TOOL_MISSING");
  return executable;
}
function runTool(executable: string, args: string[], env: NodeJS.ProcessEnv, input?: string) {
  const r = spawnSync(executable, args, { env, input, encoding: "utf8", timeout: 120000, maxBuffer: 8 * 1024 * 1024, windowsHide: true });
  // Do not print subprocess stderr: it can contain connection data or table contents.
  if (r.error || r.status !== 0) throw new Error("POSTGRES_TOOL_FAILED");
  return r.stdout;
}
function probe(dir: string, c: Connection, ca: string) {
  const output = runTool(tool(dir, "psql"), ["-X", "--no-password", "-qAt", "--set=ON_ERROR_STOP=1"], recoveryEnvironment(c, ca, process.env), RECOVERY_QUERY);
  return inventorySchema.parse(JSON.parse(output) as unknown);
}

function main() {
  const args: Record<string, string> = {};
  for (let i = 2; i < process.argv.length; i += 2) {
    const flag = process.argv[i], value = process.argv[i + 1];
    if (!flag?.startsWith("--") || !value || value.startsWith("--") || args[flag.slice(2)]) throw new Error("INVALID_ARGUMENTS");
    args[flag.slice(2)] = value;
  }
  const options = z.strictObject({ mode: z.enum(["capture", "compare"]), "project-ref": projectRef,
    "connection-file": z.string().min(1), "tools-dir": z.string().min(1), ca: z.string().min(1),
    output: z.string().min(1), archive: z.string().optional(), receipt: z.string().optional(),
    "source-manifest": z.string().optional() }).parse(args);
  const checkout = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const output = privateOutputPath(options.output, checkout, options["connection-file"]);
  const parent = realpathSync(path.dirname(output));
  privateOutputPath(path.join(parent, path.basename(output)), realpathSync(checkout), options["connection-file"]);
  if (existsSync(output)) throw new Error("OUTPUT_ALREADY_EXISTS");
  if (process.platform !== "win32" && (statSync(parent).mode & 0o077) !== 0) throw new Error("PRIVATE_DIRECTORY_PERMISSIONS_REQUIRED");
  const c = recoveryConnection(jsonFile(options["connection-file"]), options["project-ref"]);
  let archive;
  let source: { project: string; inventory: unknown } | undefined;
  if (options.mode === "capture") {
    if (!options.archive || !options.receipt || options["source-manifest"]) throw new Error("CAPTURE_REQUIRES_ARCHIVE_AND_RECEIPT");
    const size = statSync(options.archive).size;
    if (size > 256 * 1024 * 1024) throw new Error("ARCHIVE_TOO_LARGE");
    const hash = createHash("sha256").update(readFileSync(options.archive)).digest("hex");
    archive = inspectArchive(jsonFile(options.receipt), runTool(tool(options["tools-dir"], "pg_restore"), ["--list", options.archive], recoveryEnvironment(c, options.ca, process.env)), hash, size);
    if (archive.project !== options["project-ref"]) throw new Error("ARCHIVE_PROJECT_MISMATCH");
  } else {
    if (!options["source-manifest"] || options.archive || options.receipt) throw new Error("COMPARE_REQUIRES_SOURCE_MANIFEST");
    const parsed = z.object({ project: projectRef, inventory: inventorySchema }).parse(jsonFile(options["source-manifest"]));
    source = parsed;
    // Validate target before opening its connection.
    compareRecovery(source.inventory, source.inventory, source.project, options["project-ref"]);
  }
  const inventory = probe(options["tools-dir"], c, options.ca);
  const comparison = source ? compareRecovery(source.inventory, inventory, source.project, options["project-ref"]) : undefined;
  const report = { schema_version: 1, time: new Date().toISOString(), project: options["project-ref"], mode: options.mode,
    archive, inventory, comparison, restore_proven: false, writes_to_database: 0 };
  writeFileSync(output, JSON.stringify(report, null, 2) + "\n", { flag: "wx", mode: 0o600 });
  process.stdout.write(JSON.stringify({ status: comparison ? (comparison.database_matches ? "database_matches_login_pending" : "database_mismatch") : "source_captured",
    archive_verified: Boolean(archive), tables: inventory.tables.length, policies: inventory.policies, writes_to_database: 0, restore_proven: false }) + "\n");
  if (comparison && !comparison.database_matches) process.exitCode = 2;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); } catch {
    // Invalid Zod fields include passwords; never serialize exceptions from this CLI.
    process.stderr.write("RECOVERY_PREFLIGHT_FAILED: confira argumentos privados, ferramentas, TLS, conexão e cobertura. Nenhuma aprovação de recuperação foi emitida.\n");
    process.exitCode = 1;
  }
}
