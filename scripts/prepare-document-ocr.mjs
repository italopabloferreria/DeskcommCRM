import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { mkdir, copyFile, readdir, cp, writeFile } from "node:fs/promises";
const require = createRequire(import.meta.url);
const out = resolve("public/document-ocr");
const tesseract = dirname(require.resolve("tesseract.js/package.json"));
const core = dirname(
  createRequire(join(tesseract, "package.json")).resolve("tesseract.js-core/package.json"),
);
const pdf = dirname(require.resolve("pdfjs-dist/package.json"));
const data = dirname(require.resolve("@tesseract.js-data/por/package.json"));
await mkdir(out, { recursive: true });
await copyFile(join(tesseract, "dist/worker.min.js"), join(out, "worker.min.js"));
for (const file of await readdir(core)) {
  if (/^tesseract-core.*\.wasm(?:\.js)?$/.test(file))
    await copyFile(join(core, file), join(out, file));
}
await copyFile(join(data, "4.0.0_best_int/por.traineddata.gz"), join(out, "por.traineddata.gz"));
await copyFile(join(pdf, "build/pdf.worker.min.mjs"), join(out, "pdf.worker.min.mjs"));
for (const dir of ["standard_fonts", "wasm", "cmaps"])
  await cp(join(pdf, dir), join(out, dir), { recursive: true });
for (const [source, name] of [
  [tesseract, "TESSERACT_LICENSE"],
  [core, "CORE_LICENSE"],
  [pdf, "PDFJS_LICENSE"],
]) {
  const license = (await readdir(source)).find((file) => /^LICENSE(?:\..*)?$/i.test(file));
  if (!license) throw new Error("OCR dependency missing license: " + name);
  await copyFile(join(source, license), join(out, name));
}
await writeFile(
  join(out, "NOTICE.txt"),
  "Tesseract.js 6.0.1 (Apache-2.0); Portuguese traineddata @tesseract.js-data/por 1.0.0 (MIT), github.com/naptha/tessdata; PDF.js version pinned in pnpm-lock.yaml (Apache-2.0). Generated exclusively from locked dependencies. No document data included.\n",
);
