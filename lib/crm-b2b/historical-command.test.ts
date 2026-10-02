import { describe, expect, it } from "vitest";
import { prepareHistoricalCommand } from "./historical-command";
const hash = "a".repeat(64);
const customer = { kind: "company", id: "11111111-1111-4111-8111-111111111111" };
const decision = {
  data_row_index: 1,
  customer,
  location: { kind: "create_from_original" },
  accept_original_date: true,
  accept_original_value: true,
};
const sheet = {
  headers: ["Nome", "Endereço", "Valor", "Data/Atend.", "Observação", "Extra"],
  rows: [["Fictício", "  Rua fictícia  ", "0", "01/01/2024", "Observação", "Conteúdo integral"]],
};
const review = (decisions: unknown[] = [decision]) => ({ source_sha256: hash, decisions });
function prepared(source = sheet, decisions: unknown[] = [decision]) {
  const result = prepareHistoricalCommand(source, hash, "synthetic.csv", review(decisions));
  if (!result.ok) throw new Error(result.error);
  return result.data;
}
describe("preparação do comando histórico sem escrita", () => {
  it("preserva todas as colunas, endereço original e zero, sem inventar moeda ou linhagem", () => {
    const result = prepared(),
      row = result.rows[0]!;
    expect(result.status).toBe("prepared_only_not_enabled");
    expect(result.ownership_verified).toBe(false);
    expect(row).toMatchObject({
      row_kind: "service",
      company_id: customer.id,
      person_id: null,
      create_address: "  Rua fictícia  ",
      value_cents: 0,
      service_date: "2024-01-01",
      currency: null,
      original_reference: null,
    });
    expect(row.raw_data.cells).toEqual(sheet.rows[0]);
    expect(row.raw_data.headers).toEqual(sheet.headers);
    expect(result).not.toHaveProperty("organization_id");
  });
  it("endereço sem serviço cria somente um local", () => {
    const source = { ...sheet, rows: [["Fictício", "Rua fictícia", "", "", "", ""]] };
    expect(prepared(source).rows[0]).toMatchObject({
      row_kind: "location_only",
      value_cents: null,
      service_date: null,
    });
  });
  it("preserva auxiliar sem criar cliente ou serviço", () => {
    const source = { ...sheet, rows: [["Título", "", "", "", "", "Observação auxiliar"]] };
    expect(prepared(source, []).rows[0]).toMatchObject({
      row_kind: "auxiliary",
      company_id: null,
      person_id: null,
      create_address: null,
    });
    expect(prepared(source, []).rows[0]!.raw_data.cells).toEqual(source.rows[0]);
  });
  it("recusa decisões pendentes e decisão atribuída a auxiliar", () => {
    expect(prepareHistoricalCommand(sheet, hash, "synthetic.csv", review([])).ok).toBe(false);
    const auxiliary = { ...sheet, rows: [["Título", "", "", "", "", ""]] };
    expect(prepareHistoricalCommand(auxiliary, hash, "synthetic.csv", review()).ok).toBe(false);
  });
  it("ordem das decisões não muda o lote e linhas iguais permanecem distintas", () => {
    const source = { ...sheet, rows: [sheet.rows[0]!, sheet.rows[0]!] };
    const second = { ...decision, data_row_index: 2 };
    expect(prepared(source, [decision, second])).toEqual(prepared(source, [second, decision]));
    expect(prepared(source, [decision, second]).rows.map((row) => row.data_row_index)).toEqual([
      1, 2,
    ]);
  });
  it("recusa arquivo diferente e nome que contém caminho ou controle", () => {
    expect(prepareHistoricalCommand(sheet, "b".repeat(64), "synthetic.csv", review()).ok).toBe(
      false,
    );
    for (const filename of ["", "../synthetic.csv", "C:\\private.csv", "bad\n.csv"])
      expect(prepareHistoricalCommand(sheet, hash, filename, review()).ok).toBe(false);
  });
  it("recusa excesso de endereço sem truncar a fonte", () => {
    const address = "x".repeat(16385),
      source = { ...sheet, rows: [["Fictício", address, "0", "", "", ""]] };
    expect(prepareHistoricalCommand(source, hash, "synthetic.csv", review()).ok).toBe(false);
    expect(source.rows[0]![1]).toHaveLength(16385);
  });
});
