import { createHash } from "node:crypto";

export type WorkbookOriginRow = { sheet: string; row: number; cells: unknown[] };

/** Private preparation only. This plan never creates customers or approves an import. */
export function planWorkbookBatches(sourceSha256: string, rows: WorkbookOriginRow[], size = 2000) {
  if (!/^[a-f0-9]{64}$/.test(sourceSha256) || !Number.isInteger(size) || size < 1 || size > 2000)
    throw new Error("Hash ou tamanho de lote inválido.");
  if (!Array.isArray(rows) || rows.length > 100000)
    throw new Error("Quantidade de linhas inválida.");
  const seen = new Set<string>();
  const sheets = new Map<string, WorkbookOriginRow[]>();
  for (const row of rows) {
    if (
      !row.sheet?.trim() ||
      row.sheet.length > 128 ||
      !Number.isInteger(row.row) ||
      row.row < 1 ||
      row.row > 1048576 ||
      !Array.isArray(row.cells)
    )
      throw new Error("Coordenada de origem inválida.");
    const key = JSON.stringify([row.sheet, row.row]);
    if (seen.has(key)) throw new Error("Origem repetida no workbook.");
    seen.add(key);
    if (Buffer.byteLength(JSON.stringify(row), "utf8") > 2097152)
      throw new Error("Linha excede o limite de preservação.");
    const group = sheets.get(row.sheet) ?? [];
    group.push(row);
    sheets.set(row.sheet, group);
  }
  const batches = [];
  for (const [sheet, group] of sheets) {
    group.sort((a, b) => a.row - b.row);
    for (let start = 0; start < group.length; start += size) {
      const batchRows = group.slice(start, start + size).map((row) => ({
        origin: { workbook_sha256: sourceSha256, sheet, row: row.row },
        raw: structuredClone(row),
        identity: "pending" as const,
      }));
      const content = JSON.stringify({ version: 1, sheet, rows: batchRows });
      if (Buffer.byteLength(content, "utf8") > 8388608)
        throw new Error("Lote excede o limite de preservação; reduza seu tamanho.");
      batches.push({
        sheet,
        sha256: createHash("sha256").update(content).digest("hex"),
        rows: batchRows,
      });
    }
  }
  return {
    version: 1 as const,
    source_sha256: sourceSha256,
    rows: rows.length,
    sheets: sheets.size,
    batches,
    database_writes: 0 as const,
  };
}
