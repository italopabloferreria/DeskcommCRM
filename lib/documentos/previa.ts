import { z } from "zod";

export const MAX_PREVIA_BYTES = 1024 * 1024;
/** Limite conservador para Helvetica 10pt: até o glifo mais largo cabe em 180mm. */
export function linhasDoTexto(texto: string): string[] {
  return texto.split("\n").flatMap((line) => {
    const chars = Array.from(line);
    if (!chars.length) return [""];
    const lines: string[] = [];
    for (let i = 0; i < chars.length; i += 50) lines.push(chars.slice(i, i + 50).join(""));
    return lines;
  });
}
export const previaSchema = z
  .object({
    titulo: z.string().trim().min(1).max(120),
    destinatario: z.string().trim().min(1).max(180),
    paginas: z
      .array(
        z
          .object({
            texto: z
              .string()
              .max(2500)
              .refine(
                (s) => linhasDoTexto(s).length <= 32,
                "Divida o texto: máximo de 32 linhas de 50 caracteres por página.",
              ),
          })
          .strict(),
      )
      .min(1)
      .max(40),
    assinaturas: z
      .array(
        z
          .object({
            tipo: z.enum(["assinatura", "carimbo"]).default("assinatura"),
            nome: z.string().trim().min(1).max(120),
            qualificacao: z.string().trim().max(120),
            png: z
              .string()
              .max(180_000)
              .regex(/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/),
            pagina: z.number().int().min(1).max(40),
            x: z.number().finite().min(10).max(200),
            y: z.number().finite().min(35).max(255),
            largura: z.number().finite().min(15).max(90),
            altura: z.number().finite().min(5).max(35),
          })
          .strict(),
      )
      .max(2),
  })
  .strict()
  .superRefine((doc, ctx) => {
    if (new Set(doc.assinaturas.map((s) => s.tipo)).size !== doc.assinaturas.length)
      ctx.addIssue({
        code: "custom",
        message: "Use uma assinatura e um carimbo independentes.",
        path: ["assinaturas"],
      });
    doc.assinaturas.forEach((s, i) => {
      if (s.pagina > doc.paginas.length || s.x + s.largura > 200 || s.y + s.altura + 12 > 275)
        ctx.addIssue({
          code: "custom",
          message: "Assinatura fora da página ou da área útil.",
          path: ["assinaturas", i],
        });
      if (
        Array.from(s.nome).length > Math.floor((s.largura * 72) / 25.4 / 7.6) * 2 ||
        Array.from(s.qualificacao).length > Math.floor((s.largura * 72) / 25.4 / 6.7) * 2
      )
        ctx.addIssue({
          code: "custom",
          message: "Aumente a largura da imagem ou abrevie a identificação do emissor.",
          path: ["assinaturas", i, "nome"],
        });
    });
  });
export type PreviaDocumento = z.infer<typeof previaSchema>;

/** Contagem real de bytes, mesmo quando Content-Length está ausente ou é falso. */
export async function lerJsonLimitado(request: Request): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader) throw new Error("documento_corpo_invalido");
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_PREVIA_BYTES) {
        await reader.cancel();
        throw new Error("documento_limite_corpo");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  chunks.forEach((chunk) => {
    bytes.set(chunk, offset);
    offset += chunk.length;
  });
  return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
}
