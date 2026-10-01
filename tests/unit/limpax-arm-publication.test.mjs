import { describe, expect, it } from "vitest";
import { publishImages } from "../../scripts/publish-limpax-arm-images.mjs";
const sha = "a".repeat(40);
const env = { GITHUB_ACTIONS: "true", GITHUB_REPOSITORY: "italopabloferreria/DeskcommCRM",
  GITHUB_REF: "refs/heads/vertical/limpax", GITHUB_SHA: sha, GITHUB_RUN_ID: "123", GITHUB_RUN_ATTEMPT: "1" };
function setup() {
  const calls = [];
  const item = { Architecture: "arm64", Os: "linux", Config: { Labels: {
    "org.opencontainers.image.revision": sha, "org.opencontainers.image.source": "https://github.com/italopabloferreria/DeskcommCRM",
  } } };
  const run = (cmd, args) => {
    calls.push([cmd, args]);
    if (cmd === "git") return sha;
    if (args.includes("inspect")) return JSON.stringify([{ ...item,
      RepoDigests: [args.at(-1).split(":sha-")[0] + "@sha256:" + "1".repeat(64)] }]);
    return "";
  };
  return { options: { env: { ...env }, platform: "linux", arch: "arm64", run }, calls, item };
}
describe("publication emits a coherent pinned manifest only after three pushes", () => {
  it.each([{ GITHUB_ACTIONS: "false" }, { GITHUB_REPOSITORY: "other/repo" }, { GITHUB_REF: "refs/heads/main" },
    { GITHUB_SHA: "short" }, { GITHUB_RUN_ID: "../bad" }, { GITHUB_RUN_ATTEMPT: "" }])("refuses invalid context %j before touching Docker", (patch) => {
    const { options, calls } = setup();
    expect(() => publishImages({ ...options, env: { ...env, ...patch } })).toThrow();
    expect(calls).toHaveLength(0);
  });
  it("refuses a local PC before any command", () => {
    const { options, calls } = setup();
    expect(() => publishImages({ ...options, platform: "win32" })).toThrow();
    expect(calls).toHaveLength(0);
  });
  it("refuses mismatched checkout", () => {
    const { options, calls } = setup(); options.run = () => { calls.push(["git", []]); return "b".repeat(40); };
    expect(() => publishImages(options)).toThrow("Checkout");
    expect(calls).toHaveLength(1);
  });
  it.each(["Architecture", "revision", "source"])("refuses mismatched %s before publishing any image", (key) => {
    const { options, calls, item } = setup();
    if (key === "Architecture") item.Architecture = "amd64";
    else item.Config.Labels["org.opencontainers.image." + key] = "wrong";
    expect(() => publishImages(options)).toThrow("antes de publicar");
    expect(calls.some(([, args]) => args.includes("push") || args.includes("tag"))).toBe(false);
  });
  it("inspects all images first, then uses unique commit/run tags and returns three digests", () => {
    const { options, calls } = setup();
    const manifest = publishImages(options);
    expect(manifest.revision).toBe(sha);
    expect(Object.keys(manifest.images)).toEqual(["app", "worker", "scheduler"]);
    const firstPush = calls.findIndex(([, args]) => args.includes("push"));
    expect(calls.slice(0, firstPush).filter(([, args]) => args.includes("inspect"))).toHaveLength(3);
    const refs = calls.filter(([, args]) => args.includes("push")).map(([, args]) => args.at(-1));
    expect(refs).toHaveLength(3);
    expect(refs.every((ref) => ref.includes(":sha-" + sha + "-run-123-1"))).toBe(true);
    expect(Object.values(manifest.images).every((ref) => ref.includes("@sha256:"))).toBe(true);
  });
  it("never returns a complete manifest after a partial push failure", () => {
    const { options, calls } = setup(); const original = options.run;
    options.run = (c, args) => { if (args.includes("push") && args.at(-1).includes("worker")) throw new Error("failed"); return original(c, args); };
    expect(() => publishImages(options)).toThrow("failed");
    expect(calls.some(([, args]) => args.includes("push") && args.at(-1).includes("scheduler"))).toBe(false);
  });
  it("refuses missing digest after publication", () => {
    const { options } = setup(); const original = options.run;
    options.run = (c, args) => {
      const result = original(c, args);
      if (args.includes("inspect") && args.at(-1).startsWith("ghcr.io/")) {
        const value = JSON.parse(result); value[0].RepoDigests = []; return JSON.stringify(value);
      } return result;
    };
    expect(() => publishImages(options)).toThrow("Digest publicado ausente");
  });
});
