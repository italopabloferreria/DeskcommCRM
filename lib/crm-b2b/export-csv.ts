export const EXPORTS = {
  companies: {
    columns: [
      "id",
      "legal_name",
      "trade_name",
      "cnpj",
      "email",
      "phone",
      "street",
      "number",
      "complement",
      "district",
      "city",
      "state",
      "zip_code",
    ],
    headers: [
      "ID empresa",
      "Razão social",
      "Nome fantasia",
      "CNPJ",
      "E-mail",
      "Telefone",
      "Rua",
      "Número",
      "Complemento",
      "Bairro",
      "Cidade",
      "UF",
      "CEP",
    ],
  },
  people: {
    columns: ["id", "full_name", "email", "notes"],
    headers: ["ID pessoa", "Nome", "E-mail", "Observações"],
  },
  contacts: {
    columns: ["id", "person_id", "name", "display_name", "phone_number", "email", "source"],
    headers: [
      "ID contato",
      "ID pessoa",
      "Nome",
      "Nome de exibição",
      "Telefone",
      "E-mail",
      "Origem",
    ],
  },
} as const;
export type ExportKind = keyof typeof EXPORTS;
export function csvCell(value: unknown): string {
  let text = value == null ? "" : String(value);
  // Não deixar a planilha executar fórmulas vindas de nomes ou observações.
  if (/^[\s]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
}
export function exportCsv(kind: ExportKind, rows: Record<string, unknown>[]): string {
  const config = EXPORTS[kind];
  return (
    "\ufeff" +
    [
      config.headers.map(csvCell).join(";"),
      ...rows.map((row) => config.columns.map((column) => csvCell(row[column])).join(";")),
    ].join("\r\n") +
    "\r\n"
  );
}
