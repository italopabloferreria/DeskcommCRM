import { createHash } from "node:crypto";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { BUCKET_DOCUMENTOS, verificarBucket } from "./acervo";
export const arquivoSchema = z.strictObject({
  id: z.uuid(),
  titulo: z.string().min(1).max(200),
  destinatario: z.string().max(500),
  criadoEm: z.iso.datetime(),
  criadoPor: z.uuid(),
  contactId: z.uuid().nullable(),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  pdf: z.string().max(1300000),
  pedidoSha256: z.string().regex(/^[a-f0-9]{64}$/),
});
function prefixo(org: string) {
  return `${z.uuid().parse(org)}/arquivos`;
}
export function caminhoArquivo(org: string, id: string) {
  return `${prefixo(org)}/${z.uuid().parse(id)}.json`;
}
function validar(bytes: Buffer, id: string) {
  if (bytes.length > 1024 * 1024) throw new Error("arquivo_limite");
  const arquivo = arquivoSchema.parse(JSON.parse(bytes.toString("utf8")));
  const pdf = Buffer.from(arquivo.pdf, "base64");
  if (
    arquivo.id !== id ||
    !pdf.subarray(0, 5).equals(Buffer.from("%PDF-")) ||
    createHash("sha256").update(pdf).digest("hex") !== arquivo.sha256
  )
    throw new Error("arquivo_integridade");
  return { arquivo, pdf };
}
export async function lerArquivo(db: SupabaseClient, org: string, id: string) {
  const path = caminhoArquivo(org, id);
  if (!(await verificarBucket(db, false))) throw new Error("arquivo_ausente");
  const result = await db.storage.from(BUCKET_DOCUMENTOS).download(path);
  if (result.error || !result.data) throw new Error("arquivo_ausente");
  if (result.data.size > 1024 * 1024) throw new Error("arquivo_limite");
  return validar(Buffer.from(await result.data.arrayBuffer()), id);
}
export async function salvarArquivo(
  db: SupabaseClient,
  org: string,
  input: z.infer<typeof arquivoSchema>,
) {
  input = arquivoSchema.parse(input);
  const bytes = Buffer.from(JSON.stringify(input));
  validar(bytes, input.id);
  const path = caminhoArquivo(org, input.id);
  await verificarBucket(db, true);
  const { error } = await db.storage
    .from(BUCKET_DOCUMENTOS)
    .upload(path, bytes, { contentType: "application/json", upsert: false });
  if (error) {
    const existing = await lerArquivo(db, org, input.id);
    if (
      existing.arquivo.pedidoSha256 !== input.pedidoSha256 ||
      existing.arquivo.contactId !== input.contactId ||
      existing.arquivo.titulo !== input.titulo ||
      existing.arquivo.destinatario !== input.destinatario
    )
      throw new Error("arquivo_conflito");
    return { id: input.id, repetido: true };
  }
  return { id: input.id, repetido: false };
}
export async function listarArquivos(db: SupabaseClient, org: string, offset = 0) {
  z.number().int().min(0).max(10000).parse(offset);
  const path = prefixo(org);
  if (!(await verificarBucket(db, false))) return { documentos: [], proximoOffset: null };
  const result = await db.storage
    .from(BUCKET_DOCUMENTOS)
    .list(path, { limit: 26, offset, sortBy: { column: "created_at", order: "desc" } });
  if (result.error) throw new Error("arquivo_leitura");
  const documentos = [];
  for (const file of (result.data ?? []).slice(0, 25)) {
    const id = file.name.replace(/\.json$/, "");
    if (!z.uuid().safeParse(id).success) continue;
    const { arquivo } = await lerArquivo(db, org, id);
    documentos.push({
      id,
      titulo: arquivo.titulo,
      destinatario: arquivo.destinatario,
      criadoEm: arquivo.criadoEm,
      contactId: arquivo.contactId,
    });
  }
  return { documentos, proximoOffset: (result.data?.length ?? 0) > 25 ? offset + 25 : null };
}
