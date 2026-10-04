import { z } from "zod";
import { prepareHistoricalCommand } from "./historical-command";
import type { SheetMatrix } from "./spreadsheet";
import { verifyWorkbookIntegrity } from "./workbook-integrity";

const batchSchema = z.object({
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  sheet: z.string(),
  rows: z.array(
    z.object({
      origin: z.object({ workbook_sha256: z.string(), sheet: z.string(), row: z.number() }),
      raw: z.looseObject({ sheet: z.string(), row: z.number(), cells: z.array(z.unknown()) }),
    }),
  ),
});

/** Internal adapter. Decisions use the immutable batch hash, not a workbook-wide receipt.
 * Session ownership and isolated recovery are still mandatory before any SQL call.
 */
export function prepareWorkbookHistoryCommand(
  sourceSha256: string,
  input: unknown,
  mappedSheet: SheetMatrix,
  filename: string,
  review: unknown,
) {
  const parsed = batchSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Lote inválido." };
  const batch = parsed.data;
  try {
    verifyWorkbookIntegrity(sourceSha256, mappedSheet.rows.length, [input]);
  } catch {
    return { ok: false as const, error: "Lote alterado, incompleto ou com origem divergente." };
  }
  const prepared = prepareHistoricalCommand(mappedSheet, batch.sha256, filename, review);
  if (!prepared.ok) return prepared;
  const rows = prepared.data.rows.map((row, index) => ({
    ...row,
    original_reference: { ...batch.rows[index]!.origin },
    raw_data: {
      ...row.raw_data,
      workbook_source: structuredClone(batch.rows[index]!.raw),
    },
  }));
  if (
    rows.some((row) => Buffer.byteLength(JSON.stringify(row.raw_data), "utf8") > 2097152) ||
    Buffer.byteLength(JSON.stringify(rows), "utf8") > 8388608
  )
    return { ok: false as const, error: "Origem completa excede o limite; reduza o lote." };
  return { ok: true as const, data: { ...prepared.data, rows } };
}
