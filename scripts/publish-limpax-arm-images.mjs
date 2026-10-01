import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { validateManifest } from "./limpax-arm-runtime.mjs";

const SOURCES = { app: "deskcomm-smoke:pr", worker: "deskcomm-worker:pr", scheduler: "deskcomm-scheduler:pr" };
const NAMES = { app: "limpaxcrm", worker: "limpaxcrm-worker", scheduler: "limpaxcrm-scheduler" };
const REPO = "italopabloferreria/DeskcommCRM";

export function publishImages({ env = process.env, platform = process.platform, arch = process.arch, run = execute } = {}) {
  if (env.GITHUB_ACTIONS !== "true" || env.GITHUB_REPOSITORY !== REPO ||
      env.GITHUB_REF !== "refs/heads/vertical/limpax" || platform !== "linux" || arch !== "arm64") {
    throw new Error("Publicação restrita ao GitHub ARM da vertical Limpax.");
  }
  const revision = env.GITHUB_SHA;
  if (!/^[a-f0-9]{40}$/.test(revision ?? "") || !/^[1-9][0-9]*$/.test(env.GITHUB_RUN_ID ?? "") ||
      !/^[1-9][0-9]*$/.test(env.GITHUB_RUN_ATTEMPT ?? "")) throw new Error("Identificação completa da execução ausente.");
  if (run("git", ["rev-parse", "HEAD"]).trim() !== revision) throw new Error("Checkout diverge da execução.");
  // Inspect all three before the first tag/push. These are the exact images smoked by this job.
  for (const [service, ref] of Object.entries(SOURCES)) {
    const item = parseJson(run("docker", ["image", "inspect", ref]))[0];
    const labels = item?.Config?.Labels ?? {};
    if (item?.Architecture !== "arm64" || item?.Os !== "linux" ||
        labels["org.opencontainers.image.revision"] !== revision ||
        labels["org.opencontainers.image.source"] !== "https://github.com/" + REPO) {
      throw new Error("Arquitetura/procedência recusada antes de publicar: " + service);
    }
  }
  const manifest = { schema_version: 1, revision, images: {} };
  const tag = "sha-" + revision + "-run-" + env.GITHUB_RUN_ID + "-" + env.GITHUB_RUN_ATTEMPT;
  for (const [service, source] of Object.entries(SOURCES)) {
    const repository = "ghcr.io/italopabloferreria/" + NAMES[service];
    const ref = repository + ":" + tag;
    run("docker", ["tag", source, ref]);
    run("docker", ["push", ref]);
    const item = parseJson(run("docker", ["image", "inspect", ref]))[0];
    const digests = [...new Set((item?.RepoDigests ?? []).filter((digest) =>
      typeof digest === "string" && digest.startsWith(repository + "@sha256:") &&
      /^[a-f0-9]{64}$/.test(digest.slice((repository + "@sha256:").length))))];
    if (digests.length !== 1) throw new Error("Digest publicado ausente ou ambíguo: " + service);
    manifest.images[service] = digests[0];
  }
  return validateManifest(manifest);
}

function parseJson(content) {
  try { return JSON.parse(content); } catch { throw new Error("Metadados inválidos; conteúdo omitido."); }
}
function execute(command, args) {
  const result = spawnSync(command, args, { encoding: "utf8", timeout: 600000, maxBuffer: 4 * 1024 * 1024 });
  if (result.error || result.status !== 0) throw new Error("Operação de publicação falhou; manifesto completo não emitido.");
  return result.stdout;
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const manifest = publishImages();
    writeFileSync("limpax-arm-manifest.json", JSON.stringify(manifest, null, 2) + "\n", { flag: "wx" });
    process.stdout.write(JSON.stringify(manifest, null, 2) + "\n");
  } catch (error) {
    process.stderr.write(error instanceof Error ? error.message + "\n" : "Publicação recusada.\n");
    process.exitCode = 1;
  }
}
