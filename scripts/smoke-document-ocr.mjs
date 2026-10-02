/** Lightweight browser proof with synthetic documents; does not start Next or Docker. */
import { build } from "vite";
import { chromium } from "@playwright/test";
import { createServer } from "node:http";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve, join, extname, sep } from "node:path";
import assert from "node:assert/strict";
import { createElement } from "react";
import { Document, Page, Image, Text, renderToBuffer } from "@react-pdf/renderer";

const output = await mkdtemp(join(tmpdir(), "document-ocr-proof-"));
let browser, server;
let samplePdf;
try {
  await build({
    configFile: false,
    logLevel: "error",
    build: {
      outDir: output,
      emptyOutDir: false,
      lib: {
        entry: resolve("lib/documentos/ocr-browser.ts"),
        name: "DocumentOcr",
        formats: ["iife"],
        fileName: () => "proof.js",
      },
      rolldownOptions: { output: { inlineDynamicImports: true } },
    },
  });
  const publicRoot = resolve("public");
  server = createServer(async (req, res) => {
    try {
      const path = new URL(req.url, "http://localhost").pathname;
      if (path === "/sample.pdf" && samplePdf) {
        res.setHeader("Content-Type", "application/pdf");
        res.end(samplePdf);
        return;
      }
      if (path === "/") {
        res.setHeader("Content-Type", "text/html");
        res.end('<script src="/proof.js"></script>');
        return;
      }
      const file =
        path === "/proof.js" ? join(output, "proof.js") : resolve(publicRoot, "." + path);
      if (file !== join(output, "proof.js") && !file.startsWith(publicRoot + sep)) {
        res.writeHead(403).end();
        return;
      }
      const mime = {
        ".js": "text/javascript",
        ".mjs": "text/javascript",
        ".wasm": "application/wasm",
        ".gz": "application/octet-stream",
      };
      res.setHeader("Content-Type", mime[extname(file)] ?? "application/octet-stream");
      res.end(await readFile(file));
    } catch {
      res.writeHead(404).end();
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage();
  const external = [],
    errors = [];
  page.on("request", (r) => {
    if (!r.url().startsWith(origin) && !r.url().startsWith("blob:")) external.push(r.url());
  });
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(origin);
  const result = await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 1500;
    canvas.height = 550;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "black";
    ctx.font = "44px Arial";
    [
      "CONTRATO DE TESTE FICTICIO",
      "Cliente: Empresa Exemplo",
      "Servico: limpeza de teste",
      "Valor: 150 reais",
    ].forEach((t, i) => ctx.fillText(t, 60, 90 + i * 95));
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    const extracted = await window.DocumentOcr.extrairContrato(
      new File([blob], "contrato-ficticio.png", { type: "image/png" }),
      () => {},
      new AbortController().signal,
    );
    return { ...extracted, image: canvas.toDataURL("image/png") };
  });
  assert.match(result.paginas[0].texto, /CONTRATO/i);
  assert.match(result.paginas[0].texto, /Empresa Exemplo/i);
  assert.match(result.paginas[0].texto, /150/);
  assert.equal(result.paginas[0].motor, "tesseract_por");
  assert.match(result.sha256, /^[a-f0-9]{64}$/);
  samplePdf = await renderToBuffer(
    createElement(
      Document,
      {},
      createElement(
        Page,
        { size: "A4" },
        createElement(Image, { src: result.image, style: { width: 550 } }),
      ),
    ),
  );
  const scan = await page.evaluate(async () => {
    const blob = await (await fetch("/sample.pdf")).blob();
    return window.DocumentOcr.extrairContrato(
      new File([blob], "contrato-escaneado.pdf", { type: "application/pdf" }),
      () => {},
      new AbortController().signal,
    );
  });
  assert.match(scan.paginas[0].texto, /Empresa Exemplo/i);
  assert.equal(scan.paginas[0].motor, "tesseract_por");
  samplePdf = await renderToBuffer(
    createElement(
      Document,
      {},
      createElement(
        Page,
        { size: "A4" },
        createElement(Text, {}, "CONTRATO FICTICIO Empresa Exemplo servico 150 reais"),
      ),
    ),
  );
  const textPdf = await page.evaluate(async () => {
    const blob = await (await fetch("/sample.pdf")).blob();
    return window.DocumentOcr.extrairContrato(
      new File([blob], "contrato-texto.pdf", { type: "application/pdf" }),
      () => {},
      new AbortController().signal,
    );
  });
  assert.match(textPdf.paginas[0].texto, /Empresa Exemplo/);
  assert.equal(textPdf.paginas[0].motor, "pdf_texto");
  assert.deepEqual(external, []);
  assert.deepEqual(errors, []);
  console.info(
    JSON.stringify({
      ok: true,
      source: ["synthetic_png", "synthetic_scanned_pdf", "synthetic_text_pdf"],
      pages: result.paginas.length,
      confidence: result.paginas[0].confianca,
      externalRequests: 0,
    }),
  );
} finally {
  await browser?.close();
  if (server) await new Promise((resolve) => server.close(resolve));
  // Verified temporary directory from mkdtemp; never touches the checkout.
  if (output.startsWith(join(tmpdir(), "document-ocr-proof-")))
    await rm(output, { recursive: true, force: true });
}
