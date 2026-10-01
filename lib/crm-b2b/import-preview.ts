import { applyMapping, type MappingField, type SheetMatrix } from "./spreadsheet";
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
  return {
    headers: sheet.headers,
    total_rows: sheet.rows.length,
    mapping,
    raw_sample: sheet.rows.slice(0, 5),
    sample: sheet.rows.slice(0, 5).map((row) => applyMapping(sheet.headers, row, mapping)),
  };
}
