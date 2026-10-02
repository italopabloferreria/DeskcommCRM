import { z } from "zod";
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((s) => {
    const d = new Date(s + "T12:00:00Z");
    return s >= "1900-01-01" && Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === s;
  })
  .nullable();
export const historyPatchSchema = z
  .object({
    service_date: date,
    value_cents: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER).nullable(),
    currency: z
      .string()
      .regex(/^[A-Z]{3}$/)
      .nullable(),
    notes_current: z.string().max(16000),
    location_id: z.string().uuid().nullable(),
  })
  .strict();
const request_id = z.string().uuid();
const expected_version = z.number().int().min(0).max(2147483646);
export const historyCommandSchema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("correct"),
      request_id,
      expected_version,
      reason: z.enum(["source_review", "data_entry", "wrong_location"]),
      patch: historyPatchSchema,
    })
    .strict(),
  z
    .object({
      action: z.literal("void"),
      request_id,
      expected_version,
      reason: z.enum(["duplicate", "cancelled", "source_error"]),
    })
    .strict(),
  z.object({ action: z.literal("redact_person"), request_id, confirm: z.literal(true) }).strict(),
]);
export type HistoryCommand = z.infer<typeof historyCommandSchema>;
export function parseHistoryMoney(text: string): number | null {
  if (!text.trim()) return null;
  if (!/^\d+(?:[,.]\d{1,2})?$/.test(text.trim()))
    throw new Error("Informe valor sem separador de milhar e com até duas casas.");
  const [units, cents = ""] = text.trim().split(/[,.]/);
  const value = BigInt(units!) * 100n + BigInt(cents.padEnd(2, "0"));
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("Valor acima do limite.");
  return Number(value);
}
export function historySqlError(error: { code?: string; message?: string }) {
  if (["PGRST202", "42883", "42P01"].includes(error.code ?? ""))
    return {
      status: 409,
      code: "history_not_installed",
      message: "O módulo de histórico ainda não está instalado. Nenhuma alteração foi realizada.",
    };
  if (error.code === "PT409" && error.message === "history_person_has_contacts")
    return {
      status: 409,
      code: "history_person_has_contacts",
      message:
        "Esta pessoa tem telefone ativo. Use a anonimização na ficha do contato para revisar o vínculo antes de apagar dados.",
    };
  if (error.code === "54000")
    return {
      status: 413,
      code: "history_export_limit",
      message:
        "A exportação excedeu o limite seguro. Solicite uma exportação em partes; nenhum dado foi truncado.",
    };
  if (["PT409", "55006"].includes(error.code ?? ""))
    return {
      status: 409,
      code: "history_conflict",
      message:
        "O registro mudou ou há outra operação em andamento. Atualize e revise antes de tentar novamente.",
    };
  if (error.code === "P0002")
    return { status: 404, code: "not_found", message: "Registro não encontrado." };
  if (error.code === "42501")
    return {
      status: 403,
      code: "forbidden",
      message: "Operação não permitida para este registro ou perfil.",
    };
  if (["22023", "23514", "22007", "22008", "22P02"].includes(error.code ?? ""))
    return {
      status: 422,
      code: "validation_failed",
      message: "Dados inválidos ou vínculo incompatível.",
    };
  return { status: 500, code: "internal_error", message: "Não foi possível concluir a operação." };
}
export async function readHistoryJson(request: Request): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader) throw new Error("history_invalid_body");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 65536) {
        await reader.cancel();
        throw new Error("history_body_limit");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
}

export const historyViewSchema = z.object({
  available: z.boolean(),
  items: z
    .array(
      z.object({
        id: z.string().uuid(),
        revision: z.number().int().nonnegative(),
        service_date: z.string().nullable(),
        value_cents: z.number().int().safe().nullable(),
        currency: z.string().nullable(),
        notes_current: z.string(),
        location_id: z.string().uuid().nullable(),
        voided_at: z.string().nullable(),
        redacted_at: z.string().nullable(),
      }),
    )
    .max(26),
  can_correct: z.boolean(),
  can_void: z.boolean(),
  can_redact: z.boolean(),
  can_export: z.boolean().default(false),
  redacted: z.boolean(),
  locations: z
    .array(z.object({ id: z.string().uuid(), address_original: z.string() }))
    .max(201)
    .default([]),
  locations_truncated: z.boolean().default(false),
});
export type HistoryView = z.infer<typeof historyViewSchema>;
export function formatHistoryMoney(value: number | null): string {
  if (value === null) return "";
  const n = BigInt(value);
  return String(n / 100n) + "," + String(n % 100n).padStart(2, "0");
}
