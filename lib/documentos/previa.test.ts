// @vitest-environment node
import { describe, expect, it } from "vitest";
import { extractPdfText } from "@/lib/ai/rag/extractors/pdf";
import { previaSchema, lerJsonLimitado, MAX_PREVIA_BYTES } from "./previa";
import { validarPngDaAssinatura } from "./png";
import { renderizarPrevia } from "./previa-pdf";

const transparente =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAYAAAD0In+KAAAAC0lEQVR4nGNggAIAAAkAAftSuKkAAAAASUVORK5CYII=";
const opaco =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAYAAAD0In+KAAAAEUlEQVR4nGNkYGD4z8DAwAAABQ0BAeuprCUAAAAASUVORK5CYII=";
const base = {
  titulo: "Contrato teste",
  destinatario: "Cliente fictício",
  paginas: [{ texto: "Serviço de teste." }, { texto: "Segunda página." }],
  assinaturas: [],
};
const imagem = {
  tipo: "assinatura",
  nome: "Emissor teste",
  qualificacao: "Responsável",
  png: transparente,
  pagina: 1,
  x: 120,
  y: 235,
  largura: 65,
  altura: 20,
};
describe("prévia documental", () => {
  it("aceita assinatura e carimbo independentes em páginas diferentes", () => {
    const doc = previaSchema.parse({
      ...base,
      assinaturas: [imagem, { ...imagem, tipo: "carimbo", pagina: 2, x: 20 }],
    });
    expect(doc.assinaturas.map((s) => [s.tipo, s.pagina])).toEqual([
      ["assinatura", 1],
      ["carimbo", 2],
    ]);
  });
  it("recusa página inexistente, posição fora do A4 e URL remota", () => {
    for (const change of [
      { pagina: 3 },
      { x: 190 },
      { y: 255 },
      { png: "https://exemplo.com/autografo.png" },
    ])
      expect(
        previaSchema.safeParse({ ...base, assinaturas: [{ ...imagem, ...change }] }).success,
      ).toBe(false);
  });
  it("recusa texto que seria cortado e propriedades não previstas", () => {
    expect(
      previaSchema.safeParse({ ...base, paginas: [{ texto: "W".repeat(1650) }] }).success,
    ).toBe(false);
    expect(previaSchema.safeParse({ ...base, organization_id: "outra-organizacao" }).success).toBe(
      false,
    );
  });
  it("valida transparência real e recusa corrupção do PNG", () => {
    expect(validarPngDaAssinatura(transparente).length).toBeGreaterThan(40);
    expect(() => validarPngDaAssinatura(opaco)).toThrow("assinatura_png_sem_transparencia");
    const bytes = Buffer.from(transparente.split(",")[1]!, "base64");
    bytes[40] = bytes.readUInt8(40) ^ 1;
    expect(() =>
      validarPngDaAssinatura("data:image/png;base64," + bytes.toString("base64")),
    ).toThrow("assinatura_png_invalida");
  });
  it("limita bytes reais mesmo sem Content-Length", async () => {
    const req = new Request("https://crm.test", {
      method: "POST",
      body: "x".repeat(MAX_PREVIA_BYTES + 1),
    });
    await expect(lerJsonLimitado(req)).rejects.toThrow("documento_limite_corpo");
  });
  it("gera PDF legível com carimbo e assinatura sem alegar certificação", async () => {
    const doc = previaSchema.parse({
      ...base,
      assinaturas: [
        imagem,
        { ...imagem, tipo: "carimbo", nome: "Carimbo teste", pagina: 2, x: 20 },
      ],
    });
    const buffer = await renderizarPrevia(doc, "Organização teste");
    expect(buffer.subarray(0, 4).toString()).toBe("%PDF");
    const extracted = await extractPdfText(buffer);
    expect(extracted).toContain("Carimbo teste");
    expect(extracted).toContain("Emissor teste");
    expect(extracted).toContain("SEM VALOR FISCAL");
    expect(extracted).toContain("sem certificação digital");
    const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const loading = getDocument({ data: new Uint8Array(buffer) });
    const pdf = await loading.promise;
    expect(pdf.numPages).toBe(2);
    for (const n of [1, 2]) {
      const pagina = await pdf.getPage(n);
      const size = pagina.getViewport({ scale: 1 });
      expect(size.width).toBeCloseTo(595.28, 1);
      expect(size.height).toBeCloseTo(841.89, 1);
    }
    await loading.destroy();
  });
});
