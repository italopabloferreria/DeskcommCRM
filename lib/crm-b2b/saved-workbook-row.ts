/** Display the preserved CADASTRO layout only. Never infer payment or identity. */
export function savedWorkbookRow(raw: unknown) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const source = (raw as Record<string, unknown>).workbook_source;
  if (!source || typeof source !== "object" || Array.isArray(source)) return null;
  const row = source as Record<string, unknown>;
  if (typeof row.sheet !== "string" || !Number.isInteger(row.row) || !Array.isArray(row.cells))
    return null;
  const labels: Record<string, string> =
    row.sheet === "CADASTRO"
      ? {
          B: "Identificador original",
          C: "Nome original",
          D: "Endereço do atendimento",
          E: "Telefone original",
          F: "Valor registrado",
          G: "Data do atendimento",
          H: "Observações / agendou e fez",
        }
      : {};
  const fields = row.cells.flatMap((cell: unknown) => {
    if (!cell || typeof cell !== "object") return [];
    const c = cell as Record<string, unknown>;
    if (typeof c.coordinate !== "string" || !/^[A-Z]+[1-9][0-9]*$/.test(c.coordinate)) return [];
    let value = c.value;
    if (value && typeof value === "object" && "value" in value)
      value = (value as Record<string, unknown>).value;
    if (value === null || value === undefined || value === "") return [];
    const text = typeof value === "object" ? JSON.stringify(value) : String(value);
    return [
      {
        coordinate: c.coordinate,
        label: labels[c.coordinate.replace(/[0-9]/g, "")] ?? c.coordinate,
        value: text,
      },
    ];
  });
  return { sheet: row.sheet, row: row.row as number, fields };
}
