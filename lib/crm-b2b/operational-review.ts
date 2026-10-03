import type { SheetMatrix } from "./spreadsheet";
import { historicalDate } from "./historical-preview";
import { operationalColumns } from "./operational-columns";
function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
type Kind = "header" | "closure" | "record" | "review";
/** Classification is a review suggestion, never an instruction to discard a row. */
export function operationalReview(sheet: SheetMatrix) {
  const columns = operationalColumns(sheet);
  const nameIndex = columns.findIndex((c) => c.destination === "Cliente — tipo a revisar");
  const dateIndex = columns.findIndex((c) => c.destination === "Data do atendimento — revisar");
  const counts = { header: 0, closure: 0, record: 0, review: 0 };
  let datesForReview = 0;
  const sample: {
    data_row_index: number;
    kind: Kind;
    date_raw: string;
    date_status: string;
    raw_cells: string[];
  }[] = [];
  sheet.rows.forEach((row, index) => {
    const filled = row.map((value, i) => ({ value, i })).filter((c) => c.value.trim());
    const headerMatches = filled.filter(
      (c) => normalize(c.value) === normalize(sheet.headers[c.i] ?? ""),
    ).length;
    const repeated = headerMatches >= 2 && headerMatches >= filled.length / 2;
    const closure = row.some((value) =>
      /\b(total\s+fechado|fechamento|total\s+do\s+mes)\b/i.test(normalize(value)),
    );
    const name = nameIndex < 0 ? "" : (row[nameIndex] ?? "").trim();
    const dateRaw = dateIndex < 0 ? "" : (row[dateIndex] ?? "");
    const date = historicalDate(dateRaw);
    const kind: Kind = repeated
      ? "header"
      : closure
        ? "closure"
        : (nameIndex >= 0 && (!name || /^[*\s-]+$/.test(name))) || !filled.length
          ? "review"
          : "record";
    counts[kind]++;
    if ((kind === "record" || kind === "review") && date.status === "review") datesForReview++;
    if (sample.length < 25)
      sample.push({
        data_row_index: index + 1,
        kind,
        date_raw: dateRaw,
        date_status: date.status,
        raw_cells: [...row],
      });
  });
  return { total_rows: sheet.rows.length, counts, dates_for_review: datesForReview, sample };
}
