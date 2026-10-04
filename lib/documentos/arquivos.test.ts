// @vitest-environment node
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { caminhoArquivo, salvarArquivo, lerArquivo, listarArquivos } from "./arquivos";
const org = "11111111-1111-4111-8111-111111111111";
const id = "22222222-2222-4222-8222-222222222222";
function input(text = "%PDF-test") {
  const pdf = Buffer.from(text);
  return {
    id,
    titulo: "Teste",
    destinatario: "Cliente fictício",
    criadoEm: "2026-10-04T12:00:00Z",
    criadoPor: org,
    contactId: null,
    pedidoSha256: "a".repeat(64),
    sha256: createHash("sha256").update(pdf).digest("hex"),
    pdf: pdf.toString("base64"),
  };
}
function storage(publico = false) {
  const files = new Map<string, Buffer>();
  const db = {
    storage: {
      getBucket: async () => ({ data: { public: publico }, error: null }),
      from: () => ({
        upload: async (path: string, bytes: Buffer) => {
          if (files.has(path)) return { error: {} };
          files.set(path, bytes);
          return { error: null };
        },
        download: async (path: string) => ({
          data: files.has(path) ? new Blob([new Uint8Array(files.get(path)!)]) : null,
          error: files.has(path) ? null : {},
        }),
        list: async (path: string) => ({
          data: [...files.keys()]
            .filter((k) => k.startsWith(path + "/"))
            .map((k) => ({ name: k.split("/").at(-1)! })),
          error: null,
        }),
      }),
    },
  } as unknown as SupabaseClient;
  return { db, files };
}
describe("PDF privado arquivado", () => {
  it("mantém o primeiro PDF no replay mesmo com metadados de renderização diferentes", async () => {
    const s = storage();
    expect(await salvarArquivo(s.db, org, input())).toEqual({ id, repetido: false });
    expect(await salvarArquivo(s.db, org, input("%PDF-new timestamp"))).toEqual({
      id,
      repetido: true,
    });
    expect((await lerArquivo(s.db, org, id)).pdf.toString()).toBe("%PDF-test");
    await expect(
      salvarArquivo(s.db, org, { ...input(), pedidoSha256: "b".repeat(64) }),
    ).rejects.toThrow("arquivo_conflito");
  });
  it("isola organizações e recusa bucket público", async () => {
    const s = storage();
    await salvarArquivo(s.db, org, input());
    const other = "33333333-3333-4333-8333-333333333333";
    expect((await listarArquivos(s.db, other)).documentos).toEqual([]);
    await expect(lerArquivo(s.db, other, id)).rejects.toThrow("arquivo_ausente");
    await expect(salvarArquivo(storage(true).db, org, input())).rejects.toThrow(
      "documentos_bucket_nao_privado",
    );
  });
  it("recusa PDF adulterado e envelope acima do limite", async () => {
    const s = storage();
    await salvarArquivo(s.db, org, input());
    s.files.set(
      caminhoArquivo(org, id),
      Buffer.from(
        JSON.stringify({ ...input(), pdf: Buffer.from("%PDF-corrupt").toString("base64") }),
      ),
    );
    await expect(lerArquivo(s.db, org, id)).rejects.toThrow("arquivo_integridade");
    await expect(
      salvarArquivo(storage().db, org, input("%PDF-" + "x".repeat(800000))),
    ).rejects.toThrow("arquivo_limite");
  });
});
