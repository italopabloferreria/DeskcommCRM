// @vitest-environment node
import { describe, expect, it } from "vitest";
import { preencherModelo, paginarContrato } from "./modelos";
import { previaSchema } from "./previa";
import { validarArquivoOcr } from "./ocr-browser";
const doc = {
  titulo: "Contrato",
  destinatario: "{{cliente.nome}}",
  paginas: [{ texto: "Cliente: {{cliente.nome}}" }],
  assinaturas: [],
};
describe("modelos e extração", () => {
  it("preenche sem alterar o modelo ou executar campos recursivos", () => {
    const result = preencherModelo(doc, { "cliente.nome": "{{servico.valor}}" });
    expect(result.destinatario).toBe("{{servico.valor}}");
    expect(doc.destinatario).toBe("{{cliente.nome}}");
  });
  it("exige campos preenchidos e recusa nomes desconhecidos", () => {
    expect(() => preencherModelo(doc, {})).toThrow("Nome do cliente");
    expect(() => preencherModelo({ ...doc, destinatario: "{{__proto__}}" }, {})).toThrow(
      "desconhecido",
    );
  });
  it("pagina texto longo sem perder caracteres nem ultrapassar área útil", () => {
    const texto = "á".repeat(4800);
    const pages = paginarContrato([texto]);
    expect(pages).toHaveLength(3);
    expect(pages.join("").replaceAll("\n", "")).toBe(texto);
    expect(
      previaSchema.safeParse({ ...doc, paginas: pages.map((texto) => ({ texto })) }).success,
    ).toBe(true);
  });
  it("recusa contratos maiores em vez de truncar", () => {
    expect(() => paginarContrato(["a".repeat(1600 * 41)])).toThrow("40 páginas");
  });
  it("não aceita imagens duplicadas que seriam descartadas na recarga do editor", () => {
    const imagem = {
      tipo: "assinatura",
      nome: "Emissor",
      qualificacao: "",
      png: "data:image/png;base64,AAAA",
      pagina: 1,
      x: 120,
      y: 235,
      largura: 65,
      altura: 20,
    };
    expect(previaSchema.safeParse({ ...doc, assinaturas: [imagem, imagem] }).success).toBe(false);
  });
  it("rejeita arquivo falso, JPEG sem dimensões e imagem enorme antes de decodificar", () => {
    expect(() => validarArquivoOcr(new TextEncoder().encode("arquivo"))).toThrow();
    expect(() => validarArquivoOcr(new Uint8Array([255, 216, 255, 218, 0, 2]))).toThrow();
    const png = new Uint8Array(32);
    png.set([137, 80, 78, 71, 13, 10, 26, 10]);
    const view = new DataView(png.buffer);
    view.setUint32(16, 20000);
    view.setUint32(20, 20000);
    expect(() => validarArquivoOcr(png)).toThrow("megapixels");
  });
});
