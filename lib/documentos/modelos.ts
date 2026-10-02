import { z } from "zod";
import { linhasDoTexto, previaSchema, type PreviaDocumento } from "./previa";

/** Preserve every extracted line; fail instead of silently truncating a contract. */
export function paginarContrato(textos: string[]): string[] {
  const paginas = textos.flatMap((texto) => {
    const linhas = linhasDoTexto(texto.replace(/\r\n?/g, "\n"));
    const resultado: string[] = [];
    for (let n = 0; n < linhas.length; n += 32) resultado.push(linhas.slice(n, n + 32).join("\n"));
    return resultado;
  });
  if (paginas.length > 40)
    throw new Error("O texto excede 40 páginas do editor. Divida o contrato em partes.");
  return paginas.length ? paginas : [""];
}

export const CAMPOS_DOCUMENTO = {
  "cliente.nome": "Nome do cliente",
  "cliente.endereco": "Endereço",
  "cliente.documento": "CPF/CNPJ",
  "cliente.telefone": "Telefone",
  "servico.descricao": "Serviço",
  "servico.valor": "Valor informado",
  "documento.data": "Data do documento",
} as const;
export type CampoDocumento = keyof typeof CAMPOS_DOCUMENTO;
export const modeloSchema = z
  .object({
    id: z.string().uuid(),
    nome: z.string().trim().min(1).max(120),
    documento: previaSchema,
    origem: z
      .object({
        sha256: z.string().regex(/^[a-f0-9]{64}$/),
        motor: z.enum(["pdf_texto", "tesseract_por"]),
        revisado: z.boolean(),
      })
      .strict()
      .nullable(),
  })
  .strict();
export type ModeloDocumento = z.infer<typeof modeloSchema>;
export function preencherModelo(
  documento: PreviaDocumento,
  valores: Partial<Record<CampoDocumento, string>>,
): PreviaDocumento {
  const substituir = (texto: string) =>
    texto.replace(/\{\{([^{}]+)\}\}/g, (_, campo: string) => {
      if (!Object.hasOwn(CAMPOS_DOCUMENTO, campo)) throw new Error(`Campo desconhecido: ${campo}`);
      const valor = valores[campo as CampoDocumento]?.trim();
      if (!valor) throw new Error(`Preencha ${CAMPOS_DOCUMENTO[campo as CampoDocumento]}.`);
      return valor;
    });
  return previaSchema.parse({
    ...documento,
    titulo: substituir(documento.titulo),
    destinatario: substituir(documento.destinatario),
    paginas: documento.paginas.map((p) => ({ texto: substituir(p.texto) })),
  });
}
