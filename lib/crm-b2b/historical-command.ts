import { Buffer } from "node:buffer";
import { validateHistoricalReview } from "./historical-review";
import { IMPORT_MAX_DATA_ROWS, type SheetMatrix } from "./spreadsheet";

/** Server-side preparation only. Not wired to confirmation or database calls.
 * Organization and actor MUST come from authenticated server context, never this payload.
 */
export function prepareHistoricalCommand(
  sheet: SheetMatrix,
  actualSourceHash: string,
  filename: string,
  review: unknown,
) {
  if (
    !filename.trim() ||
    filename.length > 255 ||
    /[\\/\x00-\x1f\x7f]/.test(filename) ||
    sheet.rows.length < 1 ||
    sheet.rows.length > IMPORT_MAX_DATA_ROWS
  )
    return { ok: false as const, error: "Arquivo ou quantidade de linhas inválidos." };
  const validation = validateHistoricalReview(sheet, actualSourceHash, review);
  if (!validation.ok) return validation;
  if (validation.data.rows.some((row) => row.issues.length > 0))
    return {
      ok: false as const,
      error: "Resolva todas as decisões pendentes antes de preparar o lote.",
    };
  const rows = validation.data.rows.map((row) => {
    const service = [row.raw.service_date, row.raw.value, row.raw.notes].some(
      (value) => value.trim() !== "",
    );
    const auxiliary = row.status === "auxiliary_preserved";
    return {
      data_row_index: row.data_row_index,
      row_kind: auxiliary ? "auxiliary" : service ? "service" : "location_only",
      company_id: row.customer?.kind === "company" ? row.customer.id : null,
      person_id: row.customer?.kind === "person" ? row.customer.id : null,
      location_id: row.location?.kind === "existing" ? row.location.id : null,
      create_address: row.location?.kind === "create_from_original" ? row.raw.address : null,
      raw_data: { headers: [...sheet.headers], cells: [...row.raw_cells], fields: { ...row.raw } },
      original_reference: null,
      service_date: row.service_date,
      value_cents: row.value_cents,
      currency: null,
      notes_original: row.raw.notes,
    };
  });
  // Reject, never truncate. These limits match the draft SQL boundary.
  if (
    rows.some(
      (row) =>
        Buffer.byteLength(JSON.stringify(row.raw_data), "utf8") > 2097152 ||
        Buffer.byteLength(row.notes_original, "utf8") > 2097152 ||
        (row.create_address !== null && row.create_address.trim().length > 16384),
    ) ||
    Buffer.byteLength(JSON.stringify(rows), "utf8") > 8388608
  )
    return {
      ok: false as const,
      error: "O lote excede os limites de preservação; divida e revise sem remover conteúdo.",
    };
  return {
    ok: true as const,
    data: {
      status: "prepared_only_not_enabled" as const,
      source_sha256: actualSourceHash,
      filename,
      rows,
      ownership_verified: false as const,
    },
  };
}
