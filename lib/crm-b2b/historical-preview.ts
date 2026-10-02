import type { SheetMatrix } from "./spreadsheet";

const ALIASES = {
  name: ["nome", "cliente", "nome do cliente"],
  source_id: ["id", "codigo", "codigo do cliente"],
  address: ["endereco", "endereco completo", "address"],
  value: ["valor", "valor do servico", "valor atendimento"],
  service_date: ["data atend", "data atendimento", "data do atendimento", "data do servico"],
  notes: ["observacao", "observacoes", "obs"],
} as const;
type HistoricalField = keyof typeof ALIASES;
function normalized(header: string) {
  return header
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Only unambiguous decimal text; no floating-point arithmetic or payment inference. */
export function historicalValue(raw: string): {
  cents: number | null;
  status: "missing" | "parsed" | "review";
} {
  const value = raw.trim();
  if (!value) return { cents: null, status: "missing" };
  if (value.length > 20 || !/^\d+(?:,\d{1,2})?$/.test(value))
    return { cents: null, status: "review" };
  const [integer = "", fraction = ""] = value.split(",");
  const cents = BigInt(integer) * 100n + BigInt(fraction.padEnd(2, "0"));
  if (cents > BigInt(Number.MAX_SAFE_INTEGER)) return { cents: null, status: "review" };
  return { cents: Number(cents), status: "parsed" };
}

export function historicalDate(raw: string): {
  date: string | null;
  status: "missing" | "parsed" | "review";
} {
  const value = raw.trim();
  if (!value) return { date: null, status: "missing" };
  // Excel serials do not carry enough information here (epoch/style are not retained).
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match && !iso) return { date: null, status: "review" };
  const year = Number(match?.[3] ?? iso?.[1]);
  const month = Number(match?.[2] ?? iso?.[2]);
  const day = Number(match?.[1] ?? iso?.[3]);
  const candidate = new Date(Date.UTC(year, month - 1, day));
  if (
    year < 1900 ||
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() !== month - 1 ||
    candidate.getUTCDate() !== day
  )
    return { date: null, status: "review" };
  return { date: candidate.toISOString().slice(0, 10), status: "parsed" };
}

/** Full raw review rows; references are logical positions, never inferred Excel rows. */
export function historicalRowsForReview(sheet: SheetMatrix) {
  const columns: Partial<Record<HistoricalField, number>> = {};
  const ambiguousFields: HistoricalField[] = [];
  for (const field of Object.keys(ALIASES) as HistoricalField[]) {
    const matches = sheet.headers.flatMap((header, index) =>
      (ALIASES[field] as readonly string[]).includes(normalized(header)) ? [index] : [],
    );
    if (matches.length === 1) columns[field] = matches[0];
    else if (matches.length > 1) ambiguousFields.push(field);
  }
  return {
    ambiguous_fields: ambiguousFields,
    rows: sheet.rows.map((row, index) => ({
      data_row_index: index + 1,
      raw: Object.fromEntries(
        (Object.keys(ALIASES) as HistoricalField[]).map((field) => [
          field,
          columns[field] === undefined ? "" : (row[columns[field]!] ?? ""),
        ]),
      ) as Record<HistoricalField, string>,
      raw_cells: [...row],
    })),
  };
}

export function historicalPreview(sheet: SheetMatrix) {
  const columns: Partial<Record<HistoricalField, number>> = {};
  const ambiguousFields: HistoricalField[] = [];
  for (const field of Object.keys(ALIASES) as HistoricalField[]) {
    const matches = sheet.headers.flatMap((header, index) =>
      (ALIASES[field] as readonly string[]).includes(normalized(header)) ? [index] : [],
    );
    if (matches.length === 1) columns[field] = matches[0];
    else if (matches.length > 1) ambiguousFields.push(field);
  }
  const hasHistoricalColumns = ["address", "value", "service_date", "notes"].some(
    (field) =>
      columns[field as HistoricalField] !== undefined ||
      ambiguousFields.includes(field as HistoricalField),
  );
  if (!hasHistoricalColumns) return null;
  let addressRows = 0,
    serviceRows = 0,
    unnamedRows = 0,
    valueReviewRows = 0,
    dateReviewRows = 0;
  const sample = [];
  for (const [index, row] of sheet.rows.entries()) {
    const get = (field: HistoricalField) =>
      columns[field] === undefined ? "" : (row[columns[field]!] ?? "");
    const raw = Object.fromEntries(
      (Object.keys(ALIASES) as HistoricalField[]).map((field) => [field, get(field)]),
    ) as Record<HistoricalField, string>;
    const value = historicalValue(raw.value);
    const date = historicalDate(raw.service_date);
    const hasAddress = raw.address.trim() !== "";
    const hasService = [raw.value, raw.service_date, raw.notes].some((cell) => cell.trim() !== "");
    addressRows += Number(hasAddress);
    serviceRows += Number(hasService);
    unnamedRows += Number((hasAddress || hasService) && !raw.name.trim());
    valueReviewRows += Number(value.status === "review");
    dateReviewRows += Number(date.status === "review");
    if (sample.length < 5 && (hasAddress || hasService))
      sample.push({
        data_row_index: index + 1,
        raw,
        value,
        date,
      });
  }
  // Recognized historical fields cannot be repurposed as names/phones to bypass coverage.
  const blockedColumns = sheet.headers.filter(
    (header, index) =>
      ["address", "value", "service_date", "notes"].some((field) =>
        (ALIASES[field as HistoricalField] as readonly string[]).includes(normalized(header)),
      ) && sheet.rows.some((row) => (row[index] ?? "").trim() !== ""),
  );
  return {
    status: "review_only_not_importable" as const,
    address_rows: addressRows,
    service_rows: serviceRows,
    unnamed_rows: unnamedRows,
    value_review_rows: valueReviewRows,
    date_review_rows: dateReviewRows,
    ambiguous_fields: ambiguousFields,
    blocked_columns: blockedColumns,
    sample,
    row_reference: "data_row_index_is_parsed_position_not_original_excel_row" as const,
  };
}
