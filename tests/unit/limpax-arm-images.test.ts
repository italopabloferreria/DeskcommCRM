import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

const script = path.resolve("scripts/verify-limpax-arm-images.mjs");
const canonical = readFileSync(".github/workflows/publish-image.yml", "utf8");

function withWorkflow(source: string, assertion: (cwd: string) => void) {
  const cwd = mkdtempSync(path.join(tmpdir(), "limpax-arm-probes-"));
  try {
    mkdirSync(path.join(cwd, ".github/workflows"), { recursive: true });
    writeFileSync(path.join(cwd, ".github/workflows/publish-image.yml"), source);
    assertion(cwd);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
}

describe("ARM validation reuses the real production probes and fails closed", () => {
  it("finds all five canonical probes without starting Docker", () => {
    withWorkflow(canonical, (cwd) => {
      expect(execFileSync(process.execPath, [script, "--check"], { cwd, encoding: "utf8" })).toContain("Validated 5 production probes; Docker not started.");
    });
  });

  it("refuses a deleted production probe", () => {
    withWorkflow(canonical.replace("O container chega a servir?", "Deleted probe"), (cwd) => {
      const result = spawnSync(process.execPath, [script, "--check"], { cwd, encoding: "utf8" });
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain("Expected exactly one production probe");
    });
  });

  it("refuses duplicate probes rather than silently running one", () => {
    withWorkflow(`${canonical}\n      - name: O container chega a servir?\n`, (cwd) => {
      const result = spawnSync(process.execPath, [script, "--check"], { cwd, encoding: "utf8" });
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain("Expected exactly one production probe");
    });
  });

  it("refuses a changed shell block instead of passing an empty test", () => {
    const changed = canonical.replace(/(- name: O container chega a servir\?\r?\n\s+run:) \|/, "$1 >");
    expect(changed).not.toBe(canonical);
    withWorkflow(changed, (cwd) => {
      const result = spawnSync(process.execPath, [script, "--check"], { cwd, encoding: "utf8" });
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain("Probe must remain a literal shell block");
    });
  });

  it("refuses executing Docker outside GitHub even on an ARM Linux machine", () => {
    withWorkflow(canonical, (cwd) => {
      const result = spawnSync(process.execPath, [script], { cwd, encoding: "utf8", env: { ...process.env, GITHUB_ACTIONS: "false" } });
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain("only on the native ARM GitHub runner");
    });
  });
});