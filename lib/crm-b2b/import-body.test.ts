// @vitest-environment node
import { expect, it } from "vitest";
import { IMPORT_BODY_MAX_BYTES, readImportForm } from "./import-body";
it("lê arquivo multipart sintético sem alterar conteúdo", async () => {
  const form = new FormData();
  form.set("file", new File(["Nome\nFictício"], "synthetic.csv"));
  form.set("preview", "true");
  const result = await readImportForm(
    new Request("https://example.invalid", { method: "POST", body: form }),
  );
  expect(await (result.get("file") as File).text()).toBe("Nome\nFictício");
  expect(result.get("preview")).toBe("true");
});
it("recusa Content-Length excessivo antes de consumir corpo", async () => {
  const request = new Request("https://example.invalid", {
    method: "POST",
    headers: { "content-length": String(IMPORT_BODY_MAX_BYTES + 1) },
    body: "x",
  });
  await expect(readImportForm(request)).rejects.toThrow("import_body_limit");
  expect(request.bodyUsed).toBe(false);
});
it("corpo transmitido acima do limite não contorna cabeçalho pequeno", async () => {
  const request = new Request("https://example.invalid", {
    method: "POST",
    headers: { "content-length": "1" },
    body: new Uint8Array(IMPORT_BODY_MAX_BYTES + 1),
  });
  await expect(readImportForm(request)).rejects.toThrow("import_body_limit");
});
