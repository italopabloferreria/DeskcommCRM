import { readFileSync, statSync, writeFileSync, renameSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";

export const SERVICES = ["app", "worker", "scheduler", "waha", "redis", "srh", "caddy"];
const OWN = { app: "limpaxcrm", worker: "limpaxcrm-worker", scheduler: "limpaxcrm-scheduler" };
const WAHA = "devlikeapro/waha@sha256:839c142d2620d4d68e3b060b560253fe820544de912ec64415d0ebad5853959c";

export function validateManifest(value) {
  if (!value || value.schema_version !== 1 || !/^[a-f0-9]{40}$/.test(value.revision ?? "")) {
    throw new Error("Manifesto inválido: versão 1 e commit completo são obrigatórios.");
  }
  if (Object.keys(value).sort().join(",") !== "images,revision,schema_version" ||
      !value.images || Object.keys(value.images).sort().join(",") !== "app,scheduler,worker") {
    throw new Error("Manifesto inválido: somente as três imagens da Limpax são aceitas.");
  }
  for (const [service, name] of Object.entries(OWN)) {
    const prefix = "ghcr.io/italopabloferreria/" + name + "@sha256:";
    const ref = value.images[service];
    if (typeof ref !== "string" || !ref.startsWith(prefix) || !/^[a-f0-9]{64}$/.test(ref.slice(prefix.length))) {
      throw new Error("Imagem " + service + " precisa de digest imutável do registro Limpax.");
    }
  }
  return value;
}

export function createOverlay(manifest) {
  validateManifest(manifest);
  return { services: Object.fromEntries(SERVICES.map((service) => [
    service, { platform: "linux/arm64", ...(manifest.images[service] ? { image: manifest.images[service] } : {}),
      ...(service === "waha" ? { image: WAHA, environment: { WHATSAPP_DEFAULT_ENGINE: "NOWEB" } } : {}) },
  ])) };
}

export function validateConfig(config, manifest) {
  const app = config.services?.app;
  const env = app?.environment ?? {};
  if (env.NEXT_PUBLIC_SUPABASE_URL !== "https://bzretxzwnudtpxmoqjyv.supabase.co") {
    throw new Error("A instalação deve usar exclusivamente o Supabase Limpax novo.");
  }
  for (const key of ["NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_DB_URL",
    "CPF_ENCRYPTION_KEY", "WAHA_BYO_ENCRYPTION_KEY", "AI_CRED_AES_KEY", "INTERNAL_SECRET", "WAHA_API_KEY", "WAHA_HMAC_SECRET", "UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"]) {
    if (typeof env[key] !== "string" || !env[key].trim()) throw new Error("Configuração obrigatória ausente: " + key);
  }
  if (env.SUPABASE_DB_ADMIN_URL) throw new Error("Credencial administrativa não pode entrar no runtime.");
  let db;
  try { db = new URL(env.SUPABASE_DB_URL); } catch { throw new Error("Endereço privado do banco inválido."); }
  if (!["postgres:", "postgresql:"].includes(db.protocol) ||
      !decodeURIComponent(db.username).endsWith(".bzretxzwnudtpxmoqjyv") ||
      !db.hostname.endsWith(".pooler.supabase.com") || db.port !== "5432") {
    throw new Error("O banco precisa do Session pooler 5432 do projeto Limpax.");
  }
  const domain = config.services?.caddy?.environment?.DOMAIN;
  if (typeof domain !== "string" || !/^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,63}$/.test(domain)) {
    throw new Error("Domínio HTTPS válido é obrigatório.");
  }
  if (env.NEXT_PUBLIC_APP_URL !== "https://" + domain ||
      env.WAHA_WEBHOOK_BASE_URL !== "https://" + domain) {
    throw new Error("URLs públicas do app e webhook devem coincidir com o domínio HTTPS.");
  }
  if (env.WAHA_API_BASE_URL !== "http://waha:3000") throw new Error("WAHA deve ficar na rede interna.");
  if (!config.services.caddy.environment.ACME_EMAIL) throw new Error("E-mail para HTTPS ausente.");
  if (!/^[a-f0-9]{128}$/.test(config.services.waha.environment.WAHA_API_KEY?.replace(/^sha512:/, "") ?? "")) {
    throw new Error("Hash SHA512 da chave WAHA ausente ou inválido.");
  }
  if (config.services.waha.environment.WAHA_API_KEY !== "sha512:" + createHash("sha512").update(env.WAHA_API_KEY).digest("hex")) throw new Error("Chave WAHA e hash divergentes.");
  if (env.SIGNUP_MODE !== "so_convite") throw new Error("Cadastro deve permanecer restrito a convites.");
  if (config.services.srh?.environment?.SRH_TOKEN !== env.UPSTASH_REDIS_REST_TOKEN) throw new Error("Credenciais do Redis REST divergentes.");
  for (const service of SERVICES) {
    const item = config.services?.[service];
    if (!item?.image || item.platform !== "linux/arm64") throw new Error("Serviço sem imagem ARM: " + service);
    const expected = manifest.images[service] ?? (service === "waha" ? WAHA : null);
    if (expected && item.image !== expected) throw new Error("Imagem divergente: " + service);
    if (service !== "caddy" && item.ports?.length) throw new Error("Porta pública recusada: " + service);
  }
  const ports = config.services.caddy.ports ?? [];
  if (ports.length !== 2 || ports.some((p) => !["80", "443"].includes(String(p.published)))) {
    throw new Error("Somente as portas públicas padrão de HTTPS são permitidas.");
  }
}

export function runRuntime(manifest, { apply = false, platform = process.platform, arch = process.arch,
  cwd = process.cwd(), run = execute, inspectEnv = statSync, persist = persistOverlay } = {}) {
  validateManifest(manifest);
  if (platform !== "linux" || arch !== "arm64") throw new Error("Execute somente na VPS Linux ARM; não no PC local.");
  const head = run("git", ["rev-parse", "HEAD"]).trim();
  if (head !== manifest.revision) throw new Error("Checkout e imagens devem corresponder ao mesmo commit.");
  const envFile = path.join(cwd, ".env");
  const permissions = inspectEnv(envFile);
  if (!permissions.isFile() || (permissions.mode & 0o077) !== 0) throw new Error(".env deve ser privado (permissão 600).");
  const overlay = JSON.stringify(createOverlay(manifest));
  const common = ["compose", "--project-name", "limpaxcrm", "--env-file", ".env",
    "-f", "docker-compose.prod.yml", "-f", "-"];
  const config = JSON.parse(run("docker", [...common, "config", "--format", "json"], overlay));
  validateConfig(config, manifest);
  if (!apply) return "Plano validado; nenhum serviço iniciado e nenhuma imagem baixada.";
  run("docker", [...common, "pull", ...SERVICES], overlay);
  for (const service of SERVICES) {
    const image = JSON.parse(run("docker", ["image", "inspect", config.services[service].image]))[0];
    if (image?.Architecture !== "arm64" || image?.Os !== "linux") throw new Error("Imagem baixada não é Linux ARM: " + service);
    if (manifest.images[service] && (image.Config?.Labels?.["org.opencontainers.image.revision"] !== manifest.revision ||
        image.Config?.Labels?.["org.opencontainers.image.source"] !== "https://github.com/italopabloferreria/DeskcommCRM")) {
      throw new Error("Procedência da imagem recusada: " + service);
    }
  }
  persist(path.join(cwd, ".limpax-runtime.compose.json"), overlay);
  const installed = common.slice(0, -1).concat(".limpax-runtime.compose.json");
  run("docker", [...installed, "up", "-d", "--no-build", "--wait", "--wait-timeout", "180", ...SERVICES]);
  return "Serviços iniciados e sondas do Compose aprovadas. Validar login, banco e WhatsApp pelo navegador.";
}

function execute(command, args, input) {
  const result = spawnSync(command, args, { input, encoding: "utf8", timeout: 600000,
    maxBuffer: 16 * 1024 * 1024, env: { ...process.env, COMPOSE_PROFILES: "", COMPOSE_FILE: "" } });
  // Compose output can contain credentials. Never forward stdout/stderr on failure.
  if (result.error || result.status !== 0) throw new Error("Falha em " + command + "; confira privadamente o serviço na VPS. Nenhum build ou migração será tentado.");
  return result.stdout;
}

function persistOverlay(destination, content) {
  const temporary = destination + ".tmp";
  writeFileSync(temporary, content + "\n", { mode: 0o600, flag: "wx" });
  renameSync(temporary, destination);
}

export function main(args) {
  if (args.length !== 2 || !["--check-manifest", "--plan", "--apply"].includes(args[0])) {
    throw new Error("Uso: node scripts/limpax-arm-runtime.mjs --check-manifest|--plan|--apply caminho/manifesto.json");
  }
  const manifest = validateManifest(JSON.parse(readFileSync(args[1], "utf8")));
  if (args[0] === "--check-manifest") return "Manifesto válido; não comprova existência nem disponibilidade das imagens.";
  return runRuntime(manifest, { apply: args[0] === "--apply" });
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try { process.stdout.write(main(process.argv.slice(2)) + "\n"); }
  catch (error) { process.stderr.write(error instanceof Error ? error.message + "\n" : "Operação recusada.\n"); process.exitCode = 1; }
}

