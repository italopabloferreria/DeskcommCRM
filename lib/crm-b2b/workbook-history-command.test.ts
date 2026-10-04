import { describe, expect, it } from "vitest";
import { planWorkbookBatches } from "./workbook-batches";
import { prepareWorkbookHistoryCommand } from "./workbook-history-command";

const hash = "a".repeat(64);
const original = [
  {
    sheet: "Serviços A",
    row: 4182,
    cells: [{ coordinate: "D4182", formula: "A1+A2", cached: "10" }],
  },
  { sheet: "Serviços B", row: 4182, cells: ["Texto bruto"] },
];
const sheet = { headers: ["Endereço", "Valor"], rows: [["Rua fictícia", "10"]] };
const decisions = [
  {
    data_row_index: 1,
    customer: { kind: "person", id: "11111111-1111-4111-8111-111111111111" },
    location: { kind: "create_from_original" },
    accept_original_date: true,
    accept_original_value: true,
  },
];
const batches = () => planWorkbookBatches(hash, original).batches;
describe("comando histórico com origem integral", () => {
  it("usa recibos distintos por aba e conserva linha física e fórmulas", () => {
    const prepared = batches().map((batch) =>
      prepareWorkbookHistoryCommand(hash, batch, sheet, "ficticio.xlsm", {
        source_sha256: batch.sha256,
        decisions,
      }),
    );
    for (const result of prepared) expect(result.ok).toBe(true);
    const first = prepared[0]!;
    const second = prepared[1]!;
    if (!first.ok || !second.ok) throw Error("Preparação falhou");
    expect(first.data.source_sha256).not.toBe(second.data.source_sha256);
    expect(first.data.rows[0]!.original_reference).toEqual({
      workbook_sha256: hash,
      sheet: "Serviços A",
      row: 4182,
    });
    expect(first.data.rows[0]!.raw_data.workbook_source).toEqual(original[0]);
    expect(first.data.ownership_verified).toBe(false);
    expect(first.data.rows[0]!.data_row_index).toBe(1);
  });
  it("recusa decisões de outra aba e mapeamento com linha perdida", () => {
    const [first, second] = batches();
    expect(
      prepareWorkbookHistoryCommand(hash, first, sheet, "ficticio.xlsm", {
        source_sha256: second!.sha256,
        decisions,
      }).ok,
    ).toBe(false);
    expect(
      prepareWorkbookHistoryCommand(hash, first, { ...sheet, rows: [] }, "ficticio.xlsm", {
        source_sha256: first!.sha256,
        decisions,
      }).ok,
    ).toBe(false);
  });
  it("recusa células alteradas e cliente sem decisão explícita", () => {
    const batch = batches()[0]!;
    expect(
      prepareWorkbookHistoryCommand(hash, batch, sheet, "ficticio.xlsm", {
        source_sha256: batch.sha256,
        decisions: [],
      }).ok,
    ).toBe(false);
    batch.rows[0]!.raw.cells = ["alterado"];
    expect(
      prepareWorkbookHistoryCommand(hash, batch, sheet, "ficticio.xlsm", {
        source_sha256: batch.sha256,
        decisions,
      }).ok,
    ).toBe(false);
  });
});
