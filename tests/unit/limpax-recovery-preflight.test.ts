import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, chmodSync, existsSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  compareRecovery,
  inspectArchive,
  privateOutputPath,
  recoveryConnection,
  recoveryEnvironment,
  RECOVERY_QUERY,
} from "@/scripts/limpax-recovery-preflight";

const source = "bzretxzwnudtpxmoqjyv";
const target = "abcdefghijklmnopqrst";
const connection = {
  host: "aws-0-us-east-1.pooler.supabase.com", port: 5432,
  user: `postgres.${source}`, password: "test-only-secret", database: "postgres",
} as const;
const receipt = {
  project: source, sha256: "a".repeat(64), size: 500,
  contents: { table_data: { public: 1, auth: 1, storage: 1 }, policy_entries: 1, acl_entries: 1 },
};
const toc = `; Archive created at 2026-10-01
1; 0 1 TABLE DATA public organizations postgres
2; 0 2 TABLE DATA auth users supabase_auth_admin
3; 0 3 TABLE DATA storage objects supabase_storage_admin
4; 3256 4 POLICY public organizations tenant_isolation_all postgres
5; 0 0 ACL public TABLE organizations postgres
`;
const inventory = {
  version: "17.6", role: "postgres", read_only: true,
  extensions: [{ name: "vector", version: "0.8.2" }],
  tables: [{ schema: "public", name: "organizations", rows: 2, rls: true, fingerprint: "a".repeat(32), data_sha256: "d".repeat(64) }],
  policies: 1, catalog_fingerprint: "b".repeat(32), storage_objects: 0, vault_secrets: 0,
};

describe("recuperação privada: prévia somente leitura", () => {
  it("aceita Session pooler do projeto declarado", () => {
    expect(recoveryConnection(connection, source).user).toBe(`postgres.${source}`);
  });
  it("recusa projeto alheio e Transaction pooler", () => {
    expect(() => recoveryConnection(connection, target)).toThrow();
    expect(() => recoveryConnection({ ...connection, port: 6543 }, source)).toThrow();
  });
  it("aceita conexão direta somente quando host e usuário correspondem", () => {
    expect(recoveryConnection({ ...connection, host: `db.${source}.supabase.co`, user: "postgres" }, source).host).toContain(source);
    expect(() => recoveryConnection({ ...connection, host: "malicious.example", user: "postgres" }, source)).toThrow();
  });
  it("recusa propriedades extras, senha vazia e referência inválida", () => {
    expect(() => recoveryConnection({ ...connection, sslmode: "disable" }, source)).toThrow();
    expect(() => recoveryConnection({ ...connection, password: "" }, source)).toThrow();
    expect(() => recoveryConnection(connection, "x;drop table")).toThrow();
  });
  it("não herda opções libpq e exige TLS verificado e transação readonly", () => {
    const env = recoveryEnvironment(connection, "/private/ca.crt", { PATH: "/bin", PGOPTIONS: "unsafe", PGSERVICE: "prod", PGPASSFILE: "secret", PGSSLMODE: "disable" });
    expect(env.PATH).toBe("/bin");
    expect(env.PGSERVICE).toBeUndefined();
    expect(env.PGPASSFILE).toBeUndefined();
    expect(env.PGSSLMODE).toBe("verify-full");
    expect(env.PGOPTIONS).toContain("default_transaction_read_only=on");
    expect(env.PGOPTIONS).toContain("statement_timeout=45000");
  });
  it("confere checksum, tamanho e objetos das três áreas do arquivo", () => {
    expect(inspectArchive(receipt, toc, "a".repeat(64), 500).tables).toEqual({ public: 1, auth: 1, storage: 1 });
  });
  it("conta também os privilégios padrão do arquivo, sem perder cobertura ACL", () => {
    const complete = { ...receipt, contents: { ...receipt.contents, acl_entries: 2 } };
    expect(inspectArchive(complete, toc + "6; 826 6 DEFAULT ACL public DEFAULT PRIVILEGES FOR TABLES postgres\n", "a".repeat(64), 500).acl).toBe(2);
  });
  it("recusa arquivo alterado, cobertura parcial e contagem divergente", () => {
    expect(() => inspectArchive(receipt, toc, "c".repeat(64), 500)).toThrow();
    expect(() => inspectArchive(receipt, toc, "a".repeat(64), 499)).toThrow();
    expect(() => inspectArchive(receipt, toc.replace(/.*TABLE DATA auth.*\n/, ""), "a".repeat(64), 500)).toThrow();
    expect(() => inspectArchive(receipt, toc.replace(/.*POLICY.*\n/, ""), "a".repeat(64), 500)).toThrow();
  });
  it("impede usar o projeto ativo como destino mesmo com conteúdo idêntico", () => {
    expect(() => compareRecovery(inventory, inventory, source, source)).toThrow();
  });
  it("uma comparação igual prova apenas o banco, nunca login ou recuperação integral", () => {
    const result = compareRecovery(inventory, inventory, source, target);
    expect(result.database_matches).toBe(true);
    expect(result.restore_proven).toBe(false);
    expect(result.auth_login_verified).toBe(false);
  });
  it("aceita identificação de versão PostgreSQL com sufixo oficial da distribuição", () => {
    expect(compareRecovery(inventory, { ...inventory, version: "17.11 (Debian 17.11-1.pgdg13+1)" }, source, target).database_matches).toBe(true);
  });
  it("recusa verde com linhas, RLS, catálogo, extensões ou objetos diferentes", () => {
    for (const changed of [
      { ...inventory, tables: [{ ...inventory.tables[0]!, rows: 1 }] },
      { ...inventory, tables: [{ ...inventory.tables[0]!, rls: false }] },
      { ...inventory, catalog_fingerprint: "c".repeat(32) },
      { ...inventory, extensions: [{ name: "vector", version: "0.9.0" }] },
      { ...inventory, storage_objects: 1 },
      { ...inventory, version: "15.19" },
    ]) expect(compareRecovery(inventory, changed, source, target).database_matches).toBe(false);
  });
  it("bloqueia aprovação automática quando Vault contém segredos", () => {
    expect(compareRecovery({ ...inventory, vault_secrets: 1 }, { ...inventory, vault_secrets: 1 }, source, target).database_matches).toBe(false);
  });
  it("detecta conteúdo alterado mesmo com a mesma contagem e estrutura", () => {
    const changed = { ...inventory, tables: [{ ...inventory.tables[0]!, data_sha256: "e".repeat(64) }] };
    expect(compareRecovery(inventory, changed, source, target).database_matches).toBe(false);
  });
  it("recusa resultado SQL incompleto ou fora do contrato", () => {
    expect(() => compareRecovery(inventory, { ...inventory, read_only: false }, source, target)).toThrow();
    expect(() => compareRecovery(inventory, { ...inventory, tables: [] }, source, target)).toThrow();
  });
  it("a sonda começa readonly, limita timeout e encerra em rollback", () => {
    expect(RECOVERY_QUERY).toMatch(/^BEGIN READ ONLY;/);
    expect(RECOVERY_QUERY.trim()).toMatch(/ROLLBACK;$/);
    expect(RECOVERY_QUERY).not.toMatch(/\b(?:INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)\s/i);
  });
  it("impede publicar inventário privado dentro do checkout ou sobrescrever fonte", () => {
    expect(() => privateOutputPath("/repo/private.json", "/repo", "/safe/source.json")).toThrow();
    expect(() => privateOutputPath("/safe/source.json", "/repo", "/safe/source.json")).toThrow();
    expect(privateOutputPath("/private/recovery.json", "/repo", "/safe/source.json")).toContain("private");
  });
  it("o CLI recusa alvo ativo antes de iniciar psql e não imprime a senha", () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "limpax-recovery-"));
    chmodSync(dir, 0o700);
    try {
      const credentials = path.join(dir, "connection.json"), manifest = path.join(dir, "source.json"), output = path.join(dir, "output.json");
      writeFileSync(credentials, JSON.stringify(connection), { mode: 0o600 });
      writeFileSync(manifest, JSON.stringify({ project: source, inventory }), { mode: 0o600 });
      const result = spawnSync(process.execPath, ["node_modules/tsx/dist/cli.mjs", "scripts/limpax-recovery-preflight.ts",
        "--mode", "compare", "--project-ref", source, "--connection-file", credentials,
        "--tools-dir", path.join(dir, "missing-tools"), "--ca", path.join(dir, "missing-ca.crt"),
        "--output", output, "--source-manifest", manifest], { encoding: "utf8", timeout: 15000, windowsHide: true });
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("RECOVERY_PREFLIGHT_FAILED");
      expect(result.stderr + result.stdout).not.toContain(connection.password);
      expect(existsSync(output)).toBe(false);
    } finally {
      const relative = path.relative(os.tmpdir(), dir);
      if (relative.startsWith("limpax-recovery-") && !relative.includes(path.sep)) rmSync(dir, { recursive: true });
    }
  });
});
