import { describe, expect, it } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { SERVICES, createOverlay, runRuntime, validateConfig, validateManifest } from "../../scripts/limpax-arm-runtime.mjs";

const revision = "a".repeat(40);
const manifest = () => ({ schema_version: 1, revision, images: {
  app: "ghcr.io/italopabloferreria/limpaxcrm@sha256:" + "1".repeat(64),
  worker: "ghcr.io/italopabloferreria/limpaxcrm-worker@sha256:" + "2".repeat(64),
  scheduler: "ghcr.io/italopabloferreria/limpaxcrm-scheduler@sha256:" + "3".repeat(64),
} });
function configuration() {
  const config = createOverlay(manifest());
  for (const s of ["redis", "srh", "caddy"]) config.services[s].image = s + ":test";
  config.services.app.environment = {
    NEXT_PUBLIC_SUPABASE_URL: "https://bzretxzwnudtpxmoqjyv.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "fake-anon", SUPABASE_SERVICE_ROLE_KEY: "fake-service",
    SUPABASE_DB_URL: "postgresql://runtime.bzretxzwnudtpxmoqjyv:fake@aws-0-sa-east-1.pooler.supabase.com:5432/postgres",
    SUPABASE_DB_ADMIN_URL: "", INTERNAL_SECRET: "fake-internal", WAHA_API_KEY: "fake-key",
    WAHA_HMAC_SECRET: "fake-hmac", CPF_ENCRYPTION_KEY: "fake-cpf", WAHA_BYO_ENCRYPTION_KEY: "fake-byo",
    AI_CRED_AES_KEY: "fake-aes", UPSTASH_REDIS_REST_URL: "http://srh:80",
    UPSTASH_REDIS_REST_TOKEN: "fake-srh", NEXT_PUBLIC_APP_URL: "https://crm.example.com",
    WAHA_WEBHOOK_BASE_URL: "https://crm.example.com", WAHA_API_BASE_URL: "http://waha:3000",
    SIGNUP_MODE: "so_convite",
  };
  config.services.waha.environment.WAHA_API_KEY = "sha512:" + createHash("sha512").update("fake-key").digest("hex");
  config.services.srh.environment = { SRH_TOKEN: "fake-srh" };
  config.services.caddy.environment = { DOMAIN: "crm.example.com", ACME_EMAIL: "test@example.com" };
  config.services.caddy.ports = [{ published: "80" }, { published: "443" }];
  return config;
}
function fixture(check, overrides = {}) {
  const cwd = mkdtempSync(path.join(tmpdir(), "limpax-runtime-"));
  writeFileSync(path.join(cwd, ".env"), "# fake only\n", { mode: 0o600 });
  const calls = [];
  const config = configuration();
  const run = (command, args) => {
    calls.push([command, args]);
    if (command === "git") return revision;
    if (args.includes("config")) return JSON.stringify(config);
    if (args.includes("inspect")) return JSON.stringify([{ Architecture: "arm64", Os: "linux", Config: { Labels: {
      "org.opencontainers.image.revision": revision,
      "org.opencontainers.image.source": "https://github.com/italopabloferreria/DeskcommCRM",
    } } }]);
    return "";
  };
  const options = { platform: "linux", arch: "arm64", cwd, run, inspectEnv: () => ({ isFile: () => true, mode: 0o600 }), persist: () => calls.push(["persist", []]), ...overrides };
  try { check({ options, calls, config }); } finally { rmSync(cwd, { recursive: true, force: true }); }
}
describe("Limpax ARM runtime refuses unsafe installation", () => {
  it("pins all owned images and WAHA without changing the original kit", () => {
    expect(validateManifest(manifest()).revision).toBe(revision);
    expect(createOverlay(manifest()).services.waha.image).toContain("@sha256:");
  });
  it.each(["ghcr.io/melgarafael/deskcommcrm:stable", "ghcr.io/italopabloferreria/limpaxcrm:latest", "missing", "ghcr.io/italopabloferreria/limpaxcrm@sha256:abc"])("refuses mutable, upstream or incomplete app ref %s", (ref) => {
    const m = manifest(); m.images.app = ref; expect(() => validateManifest(m)).toThrow();
  });
  it("refuses unknown fields and missing images", () => {
    expect(() => validateManifest({ ...manifest(), secret: "unexpected" })).toThrow();
    const m = manifest(); delete m.images.worker; expect(() => validateManifest(m)).toThrow();
  });
  it("refuses local Windows before calling Git or Docker", () => {
    let touched = false;
    expect(() => runRuntime(manifest(), { platform: "win32", arch: "x64", run: () => { touched = true; } })).toThrow("VPS Linux ARM");
    expect(touched).toBe(false);
  });
  it("validates the plan without pulling, persisting or starting services", () => fixture(({ options, calls }) => {
    expect(runRuntime(manifest(), options)).toContain("nenhum serviço");
    expect(calls.map(([c]) => c)).toEqual(["git", "docker"]);
    expect(calls[1][1]).toContain("config");
  }));
  it("refuses a readable-by-others env before Docker", () => fixture(({ options, calls }) => {
    options.inspectEnv = () => ({ isFile: () => true, mode: 0o644 });
    expect(() => runRuntime(manifest(), options)).toThrow("permissão 600");
    expect(calls.some(([c]) => c === "docker")).toBe(false);
  }));
  it("refuses a different checkout before reading runtime configuration", () => fixture(({ options, calls }) => {
    options.run = () => { calls.push(["git", []]); return "b".repeat(40); };
    expect(() => runRuntime(manifest(), options)).toThrow("mesmo commit");
    expect(calls).toHaveLength(1);
  }));
  it.each(["NEXT_PUBLIC_SUPABASE_URL", "WAHA_API_BASE_URL", "SIGNUP_MODE", "NEXT_PUBLIC_APP_URL", "UPSTASH_REDIS_REST_TOKEN"])("refuses unsafe %s before pulling images", (key) => fixture(({ options, config, calls }) => {
    config.services.app.environment[key] = "unsafe";
    expect(() => runRuntime(manifest(), { ...options, apply: true })).toThrow();
    expect(calls.some(([, args]) => args.includes("pull"))).toBe(false);
  }));
  it("hides malformed database credentials from error text", () => {
    const config = configuration(); config.services.app.environment.SUPABASE_DB_URL = "secret-password-not-a-url";
    expect(() => validateConfig(config, manifest())).toThrow("Endereço privado do banco inválido.");
  });
  it("refuses public WAHA port", () => {
    const config = configuration(); config.services.waha.ports = [{ published: "3030" }];
    expect(() => validateConfig(config, manifest())).toThrow("Porta pública");
  });
  it("refuses mismatched WAHA hash", () => {
    const config = configuration(); config.services.waha.environment.WAHA_API_KEY = "sha512:" + "f".repeat(128);
    expect(() => validateConfig(config, manifest())).toThrow("hash divergentes");
  });
  it("pull failure stops before image inspection, persistence or up; no fallback build", () => fixture(({ options, calls }) => {
    const original = options.run;
    options.run = (c, args, input) => { if (args.includes("pull")) throw new Error("pull failed"); return original(c, args, input); };
    expect(() => runRuntime(manifest(), { ...options, apply: true })).toThrow("pull failed");
    expect(calls.some(([c]) => c === "persist")).toBe(false);
    expect(calls.some(([, args]) => args.includes("up") || args.includes("build"))).toBe(false);
  }));
  it("refuses an amd64 image before changing runtime", () => fixture(({ options, calls }) => {
    const original = options.run;
    options.run = (c, args, input) => args.includes("inspect") ? '[{"Architecture":"amd64","Os":"linux"}]' : original(c, args, input);
    expect(() => runRuntime(manifest(), { ...options, apply: true })).toThrow("não é Linux ARM");
    expect(calls.some(([c]) => c === "persist")).toBe(false);
  }));
  it("refuses an image built from a different commit", () => fixture(({ options, calls }) => {
    const original = options.run;
    options.run = (c, args, input) => args.includes("inspect") ? '[{"Architecture":"arm64","Os":"linux","Config":{"Labels":{}}}]' : original(c, args, input);
    expect(() => runRuntime(manifest(), { ...options, apply: true })).toThrow("Procedência");
    expect(calls.some(([c]) => c === "persist")).toBe(false);
  }));
  it("inspects every image before persisting, then starts only chosen services without building", () => fixture(({ options, calls }) => {
    expect(runRuntime(manifest(), { ...options, apply: true })).toContain("Serviços iniciados");
    const persist = calls.findIndex(([c]) => c === "persist");
    expect(calls.slice(0, persist).filter(([, args]) => args.includes("inspect"))).toHaveLength(7);
    const up = calls.at(-1)[1];
    expect(up).toContain("--no-build"); expect(up).toContain("--wait");
    expect(up.slice(-7)).toEqual(SERVICES);
    expect(calls.some(([, args]) => args.includes("build") || args.includes("psql"))).toBe(false);
  }));
});

