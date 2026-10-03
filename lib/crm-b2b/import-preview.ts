import { applyMapping, type MappingField, type SheetMatrix } from "./spreadsheet";
import { historicalPreview } from "./historical-preview";
import { operationalColumns } from "./operational-columns";
import { operationalReview } from "./operational-review";
export const IMPORT_FIELDS: { key: MappingField; label: string }[] = [
  { key: "company_name", label: "Empresa" },
  { key: "legal_name", label: "Razão social" },
  { key: "trade_name", label: "Nome fantasia" },
  { key: "cnpj", label: "CNPJ" },
  { key: "person_name", label: "Pessoa responsável" },
  { key: "job_title", label: "Cargo" },
  { key: "phone", label: "Telefone" },
  { key: "email", label: "E-mail" },
];
export interface ImportColumnCoverage {
  header: string;
  populated_rows: number;
}

/** Counts the whole file; a five-row sample cannot prove that a column is empty. */
export function importColumnCoverage(sheet: SheetMatrix): ImportColumnCoverage[] {
  return sheet.headers.map((header, index) => ({
    header,
    populated_rows: sheet.rows.filter((row) => (row[index] ?? "").trim() !== "").length,
  }));
}

export function uncoveredImportColumns(
  coverage: ImportColumnCoverage[],
  mapping: Partial<Record<MappingField, string>>,
): ImportColumnCoverage[] {
  const mapped = new Set(Object.values(mapping).filter(Boolean));
  return coverage.filter((column) => column.populated_rows > 0 && !mapped.has(column.header));
}
export function mappingError(
  headers: string[],
  mapping: Partial<Record<MappingField, string>>,
): string | null {
  if (headers.some((h) => !h) || new Set(headers).size !== headers.length)
    return "A planilha precisa de cabeçalhos preenchidos e sem repetição.";
  if (Object.values(mapping).some((h) => h && !headers.includes(h)))
    return "O mapeamento contém uma coluna que não existe no arquivo.";
  if (
    !["company_name", "legal_name", "trade_name", "cnpj", "person_name", "phone"].some(
      (k) => mapping[k as MappingField],
    )
  )
    return "Selecione ao menos empresa, pessoa ou telefone para identificar os registros.";
  return null;
}
export function importPreview(sheet: SheetMatrix, mapping: Partial<Record<MappingField, string>>) {
  const coverage = importColumnCoverage(sheet);
  return {
    headers: sheet.headers,
    operational_columns: operationalColumns(sheet),
    operational_review: operationalReview(sheet),
    total_rows: sheet.rows.length,
    mapping,
    column_coverage: coverage,
    unmapped_columns: uncoveredImportColumns(coverage, mapping),
    historical_review: historicalPreview(sheet),
    raw_sample: sheet.rows.slice(0, 5),
    sample: sheet.rows.slice(0, 5).map((row) => applyMapping(sheet.headers, row, mapping)),
  };
}
