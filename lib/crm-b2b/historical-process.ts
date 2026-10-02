import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { historySqlError } from "./history-management";
export const historicalReceiptSchema = z
  .object({
    receipt_id: z.uuid(),
    batch_id: z.uuid(),
    total_rows: z.number().int().min(1).max(2000),
    service_rows: z.number().int().min(0).max(2000),
    locations_created: z.number().int().min(0).max(2000),
    auxiliary_rows: z.number().int().min(0).max(2000),
    reused: z.boolean(),
    reversed_at: z.iso.datetime({ offset: true }).nullable().optional(),
  })
  .refine(
    (r) => r.service_rows + r.auxiliary_rows <= r.total_rows && r.locations_created <= r.total_rows,
  );
export type HistoricalReceipt = z.infer<typeof historicalReceiptSchema>;
export const historyReversalSchema = z.strictObject({
  request_id: z.uuid(),
  confirm: z.literal(true),
});
export const historyReversalReceiptSchema = z.object({
  batch_id: z.uuid(),
  request_id: z.uuid(),
  voided_services: z.number().int().min(0).max(2000),
  reversed_at: z.iso.datetime({ offset: true }),
  reused: z.boolean(),
});
export function historicalImportError(error: { code?: string; message?: string }) {
  if (error.code === "P0001")
    return {
      status: 409,
      code: "history_conflict",
      message: "Este arquivo já foi importado com outras decisões. Confira o lote existente.",
    };
  if (error.code === "PT409" && error.message === "history_batch_modified")
    return {
      status: 409,
      code: "history_conflict",
      message:
        "O lote contém serviços alterados depois da importação. Revise cada serviço antes de reverter.",
    };
  return historySqlError(error);
}
/** Session client only. SQL verifies organization/customer ownership under locks.
 * This function never writes individual rows or retries with a weaker path.
 */
export async function confirmHistoricalImport(
  db: SupabaseClient,
  org: string,
  command: { source_sha256: string; filename: string; rows: unknown[] },
) {
  const { data, error } = await db.rpc("fn_limpax_history_import_atomic", {
    p_organization_id: org,
    p_source_sha256: command.source_sha256,
    p_filename: command.filename,
    p_rows: command.rows,
  });
  if (error) return { ok: false as const, error: historicalImportError(error) };
  const parsed = historicalReceiptSchema.safeParse(data);
  if (!parsed.success)
    return {
      ok: false as const,
      error: {
        status: 500,
        code: "internal_error",
        message:
          "O banco não confirmou o recibo. Reenvie o mesmo arquivo e as mesmas decisões para conferir o lote.",
      },
    };
  return { ok: true as const, data: parsed.data };
}
