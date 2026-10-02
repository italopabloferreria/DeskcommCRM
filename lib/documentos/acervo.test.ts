// @vitest-environment node
import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { caminhoModelo, salvarModelo, lerModelo, listarModelos } from "./acervo";
const org = "11111111-1111-4111-8111-111111111111";
const modelo = {
  id: "22222222-2222-4222-8222-222222222222",
  nome: "Contrato fictício",
  documento: {
    titulo: "Teste",
    destinatario: "{{cliente.nome}}",
    paginas: [{ texto: "Teste" }],
    assinaturas: [],
  },
  origem: null,
};
function storage(publico = false) {
  const arquivos = new Map<string, Buffer>();
  const upload = vi.fn(async (path: string, bytes: Buffer) => {
    if (arquivos.has(path)) return { error: { message: "exists" } };
    arquivos.set(path, bytes);
    return { error: null };
  });
  const download = vi.fn(async (path: string) => ({
    data: arquivos.has(path) ? new Blob([new Uint8Array(arquivos.get(path)!)]) : null,
    error: arquivos.has(path) ? null : { message: "missing" },
  }));
  const list = vi.fn(async (_path: string, options: { offset: number; limit: number }) => ({
    data: [...arquivos.keys()]
      .slice(options.offset, options.offset + options.limit)
      .map((path) => ({
        name: path.split("/").at(-1),
        created_at: "2026-10-01T00:00:00Z",
        metadata: {},
      })),
    error: null,
  }));
  const db = {
    storage: {
      getBucket: vi.fn(async () => ({ data: { public: publico }, error: null })),
      from: vi.fn(() => ({ upload, download, list })),
    },
  } as unknown as SupabaseClient;
  return { db, upload, download, list, arquivos };
}
describe("acervo privado", () => {
  it("provisiona bucket privado somente quando falta e confere o resultado", async () => {
    const s = storage();
    vi.mocked(s.db.storage.getBucket).mockResolvedValueOnce({
      data: null,
      error: { statusCode: "404" },
    } as never);
    const createBucket = vi.fn(async () => ({ error: null }));
    Object.assign(s.db.storage, { createBucket });
    await salvarModelo(s.db, org, modelo, "ator");
    expect(createBucket).toHaveBeenCalledWith("documentos-privados", {
      public: false,
      fileSizeLimit: 1024 * 1024,
      allowedMimeTypes: ["application/json"],
    });
    expect(s.db.storage.getBucket).toHaveBeenCalledTimes(2);
  });
  it("pagina o catálogo e lê nomes do conteúdo validado sem depender de metadata", async () => {
    const s = storage();
    for (let n = 0; n < 26; n++)
      await salvarModelo(s.db, org, { ...modelo, nome: `Contrato ${n}` }, "ator");
    const primeira = await listarModelos(s.db, org);
    expect(primeira.modelos).toHaveLength(25);
    expect(primeira.proximoOffset).toBe(25);
    expect(primeira.modelos[0]?.nome).toBe("Contrato 0");
    const segunda = await listarModelos(s.db, org, 25);
    expect(segunda.modelos).toHaveLength(1);
    expect(segunda.proximoOffset).toBeNull();
    expect(segunda.modelos[0]?.nome).toBe("Contrato 25");
    await expect(listarModelos(s.db, org, -1)).rejects.toThrow("paginacao");
  });
  it("salva versão imutável e replay não sobrescreve", async () => {
    const s = storage();
    const saved = await salvarModelo(s.db, org, modelo, "ator");
    expect(saved.repetido).toBe(false);
    expect((await salvarModelo(s.db, org, modelo, "ator")).repetido).toBe(true);
    expect(s.upload.mock.calls[0]?.[0]).toBe(`${org}/modelos/${modelo.id}-${saved.versao}.json`);
    expect(await lerModelo(s.db, org, modelo.id, saved.versao)).toEqual(modelo);
    const outraOrg = "33333333-3333-4333-8333-333333333333";
    await expect(lerModelo(s.db, outraOrg, modelo.id, saved.versao)).rejects.toThrow();
  });
  it("nega bucket público e revisão OCR não confirmada antes de enviar", async () => {
    const s = storage(true);
    await expect(salvarModelo(s.db, org, modelo, "ator")).rejects.toThrow("nao_privado");
    expect(s.upload).not.toHaveBeenCalled();
    const privado = storage();
    await expect(
      salvarModelo(
        privado.db,
        org,
        { ...modelo, origem: { sha256: "a".repeat(64), motor: "tesseract_por", revisado: false } },
        "ator",
      ),
    ).rejects.toThrow("revisao");
    expect(privado.upload).not.toHaveBeenCalled();
  });
  it("recusa travessia de caminho e corrupção do conteúdo", async () => {
    expect(() => caminhoModelo(org, "../outra", "a".repeat(64))).toThrow();
    const s = storage();
    const saved = await salvarModelo(s.db, org, modelo, "ator");
    const path = caminhoModelo(org, modelo.id, saved.versao);
    s.arquivos.set(path, Buffer.from("alterado"));
    expect(createHash("sha256").update("alterado").digest("hex")).not.toBe(saved.versao);
    await expect(lerModelo(s.db, org, modelo.id, saved.versao)).rejects.toThrow("integridade");
  });
  it("preserva assinatura, carimbo e posições entre versões", async () => {
    const s = storage();
    const imagem = {
      tipo: "assinatura" as const,
      nome: "Emissor",
      qualificacao: "",
      png: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAYAAAD0In+KAAAAC0lEQVR4nGNggAIAAAkAAftSuKkAAAAASUVORK5CYII=",
      pagina: 1,
      x: 120,
      y: 235,
      largura: 65,
      altura: 20,
    };
    const comImagens = {
      ...modelo,
      documento: {
        ...modelo.documento,
        assinaturas: [imagem, { ...imagem, tipo: "carimbo" as const, x: 20 }],
      },
    };
    const primeira = await salvarModelo(s.db, org, comImagens, "ator");
    const segunda = await salvarModelo(
      s.db,
      org,
      { ...comImagens, nome: "Versão revisada" },
      "ator",
    );
    expect(primeira.versao).not.toBe(segunda.versao);
    expect((await lerModelo(s.db, org, modelo.id, primeira.versao)).documento.assinaturas).toEqual(
      comImagens.documento.assinaturas,
    );
    expect(s.arquivos.size).toBe(2);
  });
});
