import { createHash } from "node:crypto";
import { z } from "zod";

const hash = z.string().regex(/^[a-f0-9]{64}$/);
const rawRow = z.looseObject({
  sheet: z.string().min(1).max(128),
  row: z.number().int().min(1).max(1048576),
  cells: z.array(z.unknown()),
});
const batchSchema = z.strictObject({
  sheet: z.string().min(1).max(128),
  sha256: hash,
  rows: z
    .array(
      z.strictObject({
        origin: z.strictObject({ workbook_sha256: hash, sheet: z.string(), row: z.number().int() }),
        raw: rawRow,
        identity: z.literal("pending"),
      }),
    )
    .min(1)
    .max(2000),
});

/** Verifies private preparation, never grants permission to import customers. */
export function verifyWorkbookIntegrity(
  sourceSha256: string,
  expectedRows: number,
  input: unknown,
) {
  const parsed = z.array(batchSchema).max(100000).safeParse(input);
  if (
    !hash.safeParse(sourceSha256).success ||
    !Number.isSafeInteger(expectedRows) ||
    expectedRows < 0 ||
    !parsed.success
  )
    throw new Error("Preparação inválida.");
  const origins = new Set<string>();
  const batchHashes = new Set<string>();
  const sheets = new Set<string>();
  for (const [index, batch] of parsed.data.entries()) {
    const content = JSON.stringify({
      version: 1,
      sheet: batch.sheet,
      rows: (input as { rows: unknown }[])[index]!.rows,
    });
    if (
      Buffer.byteLength(content, "utf8") > 8388608 ||
      createHash("sha256").update(content).digest("hex") !== batch.sha256 ||
      batchHashes.has(batch.sha256)
    )
      throw new Error("Lote alterado ou repetido.");
    batchHashes.add(batch.sha256);
    sheets.add(batch.sheet);
    let previous = 0;
    for (const row of batch.rows) {
      if (
        row.origin.workbook_sha256 !== sourceSha256 ||
        row.origin.sheet !== batch.sheet ||
        row.raw.sheet !== batch.sheet ||
        row.origin.row !== row.raw.row ||
        row.raw.row <= previous
      )
        throw new Error("Origem inconsistente.");
      previous = row.raw.row;
      const key = JSON.stringify([batch.sheet, row.raw.row]);
      if (origins.has(key)) throw new Error("Linha repetida entre lotes.");
      origins.add(key);
    }
  }
  if (origins.size !== expectedRows) throw new Error("Cobertura incompleta.");
  return {
    rows: origins.size,
    sheets: sheets.size,
    batches: batchHashes.size,
    database_writes: 0 as const,
    ready_to_import: false as const,
  };
}
