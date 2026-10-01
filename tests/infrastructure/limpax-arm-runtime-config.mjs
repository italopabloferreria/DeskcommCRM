import { mkdtempSync, copyFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync, execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { runRuntime } from "../../scripts/limpax-arm-runtime.mjs";

if (process.env.GITHUB_ACTIONS !== "true" || process.platform !== "linux" || process.arch !== "arm64") {
  throw new Error("Prova real do Compose restrita ao runner GitHub ARM.");
}
const revision = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const manifest = { schema_version: 1, revision, images: Object.fromEntries(
  ["app", "worker", "scheduler"].map((service, index) => [service,
    "ghcr.io/italopabloferreria/limpaxcrm" + (service === "app" ? "" : "-" + service) + "@sha256:" + String(index + 1).repeat(64)]),
) };
const env = {
  NEXT_PUBLIC_SUPABASE_URL: "https://bzretxzwnudtpxmoqjyv.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "fake-anon", SUPABASE_SERVICE_ROLE_KEY: "fake-service",
  SUPABASE_DB_URL: "postgresql://runtime.bzretxzwnudtpxmoqjyv:fake@aws-0-sa-east-1.pooler.supabase.com:5432/postgres",
  INTERNAL_SECRET: "fake-internal", WAHA_API_KEY: "fake-key", WAHA_HMAC_SECRET: "fake-hmac",
  CPF_ENCRYPTION_KEY: "fake-cpf", WAHA_BYO_ENCRYPTION_KEY: "fake-byo", AI_CRED_AES_KEY: "fake-aes",
  WAHA_API_KEY_SHA512: createHash("sha512").update("fake-key").digest("hex"),
  UPSTASH_REDIS_REST_URL: "http://srh:80", UPSTASH_REDIS_REST_TOKEN: "fake-srh", SRH_TOKEN: "fake-srh",
  NEXT_PUBLIC_APP_URL: "https://crm.example.com", WAHA_WEBHOOK_BASE_URL: "https://crm.example.com",
  WAHA_API_BASE_URL: "http://waha:3000", SIGNUP_MODE: "so_convite",
  DOMAIN: "crm.example.com", ACME_EMAIL: "test@example.com",
};
const cwd = mkdtempSync(path.join(tmpdir(), "limpax-real-compose-"));
try {
  copyFileSync("docker-compose.prod.yml", path.join(cwd, "docker-compose.prod.yml"));
  copyFileSync("Caddyfile", path.join(cwd, "Caddyfile"));
  writeFileSync(path.join(cwd, ".env"), Object.entries(env).map(([k, v]) => k + "=" + v).join("\n"), { mode: 0o600 });
  const run = (command, args, input) => {
    if (command === "git") return revision;
    if (!args.includes("config")) throw new Error("Esta prova não pode baixar imagens ou subir serviços.");
    const result = spawnSync(command, args, { cwd, input, encoding: "utf8",
      env: { ...process.env, COMPOSE_PROFILES: "", COMPOSE_FILE: "" } });
    if (result.status !== 0) throw new Error("Compose real recusou a fixture fictícia.");
    return result.stdout;
  };
  process.stdout.write(runRuntime(manifest, { cwd, run }) + "\n");
} finally { rmSync(cwd, { recursive: true, force: true }); }

