import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { modeloSchema, type ModeloDocumento } from "./modelos";
import { validarPngDaAssinatura } from "./png";

export const BUCKET_DOCUMENTOS = "documentos-privados";
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
function prefixo(org: string) {
  if (!uuid.test(org)) throw new Error("documentos_org_invalida");
  return `${org}/modelos`;
}
export function caminhoModelo(org: string, id: string, versao: string) {
  if (!uuid.test(id) || !/^[a-f0-9]{64}$/.test(versao))
    throw new Error("documentos_modelo_invalido");
  return `${prefixo(org)}/${id}-${versao}.json`;
}
/** Bucket novo sem policies de leitura/escrita públicas: acesso apenas pelo servidor. */
async function verificarBucket(db: SupabaseClient, criar: boolean): Promise<boolean> {
  let { data, error } = await db.storage.getBucket(BUCKET_DOCUMENTOS);
  if (error) {
    const missing =
      String(error.statusCode) === "404" ||
      (String(error.statusCode) === "400" && error.message === "Bucket not found");
    if (!missing) throw new Error("documentos_storage_indisponivel");
    if (!criar) return false;
    await db.storage.createBucket(BUCKET_DOCUMENTOS, {
      public: false,
      fileSizeLimit: 1024 * 1024,
      allowedMimeTypes: ["application/json"],
    });
    ({ data, error } = await db.storage.getBucket(BUCKET_DOCUMENTOS));
  }
  if (error || !data || data.public) throw new Error("documentos_bucket_nao_privado");
  return true;
}
export async function salvarModelo(
  db: SupabaseClient,
  org: string,
  modelo: ModeloDocumento,
  actor: string,
) {
  prefixo(org);
  modelo = modeloSchema.parse(modelo);
  if (modelo.origem && !modelo.origem.revisado)
    throw new Error("documentos_ocr_revisao_obrigatoria");
  modelo.documento.assinaturas.forEach((s) => validarPngDaAssinatura(s.png));
  const bytes = Buffer.from(JSON.stringify(modelo));
  if (bytes.length > 1024 * 1024) throw new Error("documentos_modelo_grande");
  const versao = createHash("sha256").update(bytes).digest("hex");
  const path = caminhoModelo(org, modelo.id, versao);
  await verificarBucket(db, true);
  const bucket = db.storage.from(BUCKET_DOCUMENTOS);
  const { error } = await bucket.upload(path, bytes, {
    contentType: "application/json",
    upsert: false,
    metadata: { nome: modelo.nome, criado_por: actor },
  });
  if (error) {
    // Replay só é sucesso se os bytes existentes forem os mesmos; nunca upsert.
    const existing = await bucket.download(path);
    if (
      existing.error ||
      !existing.data ||
      createHash("sha256")
        .update(Buffer.from(await existing.data.arrayBuffer()))
        .digest("hex") !== versao
    )
      throw new Error("documentos_gravacao_falhou");
    return { id: modelo.id, versao, repetido: true };
  }
  return { id: modelo.id, versao, repetido: false };
}
export async function listarModelos(db: SupabaseClient, org: string, offset = 0) {
  if (!Number.isSafeInteger(offset) || offset < 0 || offset > 10000)
    throw new Error("documentos_paginacao_invalida");
  const path = prefixo(org);
  if (!(await verificarBucket(db, false))) return { modelos: [], proximoOffset: null };
  const { data, error } = await db.storage
    .from(BUCKET_DOCUMENTOS)
    .list(path, { limit: 26, offset, sortBy: { column: "created_at", order: "desc" } });
  if (error) throw new Error("documentos_leitura_falhou");
  const modelos: { id: string; versao: string; nome: string; criadoEm: string | null }[] = [];
  for (const file of (data ?? []).slice(0, 25)) {
    const match = /^([a-f0-9-]{36})-([a-f0-9]{64})\.json$/i.exec(file.name);
    if (!match) continue;
    // Storage list metadata does not reliably include custom upload metadata.
    // Read the validated immutable object, sequentially to bound memory.
    const modelo = await lerModelo(db, org, match[1]!, match[2]!);
    modelos.push({
      id: modelo.id,
      versao: match[2]!,
      nome: modelo.nome,
      criadoEm: file.created_at,
    });
  }
  return { modelos, proximoOffset: (data ?? []).length > 25 ? offset + 25 : null };
}
export async function lerModelo(db: SupabaseClient, org: string, id: string, versao: string) {
  const path = caminhoModelo(org, id, versao);
  if (!(await verificarBucket(db, false))) throw new Error("documentos_modelo_nao_encontrado");
  const { data, error } = await db.storage.from(BUCKET_DOCUMENTOS).download(path);
  if (error || !data) throw new Error("documentos_modelo_nao_encontrado");
  if (data.size > 1024 * 1024) throw new Error("documentos_modelo_grande");
  const bytes = Buffer.from(await data.arrayBuffer());
  if (createHash("sha256").update(bytes).digest("hex") !== versao)
    throw new Error("documentos_integridade_invalida");
  const modelo = modeloSchema.parse(JSON.parse(bytes.toString("utf8")));
  if (modelo.id !== id) throw new Error("documentos_integridade_invalida");
  return modelo;
}
