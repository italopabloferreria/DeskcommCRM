import { describe, expect, it } from "vitest";
import { savedWorkbookRow } from "./saved-workbook-row";
describe("preserved workbook display", () => {
  it("keeps typed values, multiple dates and formulas literal", () => {
    const result = savedWorkbookRow({
      workbook_source: {
        sheet: "CADASTRO",
        row: 27,
        cells: [
          { coordinate: "D27", value: { type: "str", value: "Endereço sintético" } },
          { coordinate: "F27", value: { type: "float", value: "180.50" } },
          { coordinate: "G27", value: { type: "str", value: "12/13 e 14/08/25" } },
          { coordinate: "H27", value: { type: "str", value: "=SUM(A1:A2)" } },
        ],
      },
    });
    expect(result?.fields.map((f) => f.value)).toEqual([
      "Endereço sintético",
      "180.50",
      "12/13 e 14/08/25",
      "=SUM(A1:A2)",
    ]);
    expect(result?.fields[0]?.label).toBe("Endereço do atendimento");
  });
  it("does not assign CADASTRO labels to other sheets", () => {
    expect(
      savedWorkbookRow({
        workbook_source: { sheet: "Outra", row: 1, cells: [{ coordinate: "D1", value: 0 }] },
      })?.fields,
    ).toEqual([{ coordinate: "D1", label: "D1", value: "0" }]);
  });
  it("handles absent and malformed source without exposing arbitrary properties", () => {
    expect(savedWorkbookRow(null)).toBeNull();
    expect(savedWorkbookRow({ workbook_source: { sheet: "A", row: "1", cells: [] } })).toBeNull();
    expect(
      savedWorkbookRow({
        workbook_source: {
          sheet: "A",
          row: 1,
          cells: [null, { coordinate: "bad", value: "x" }, { coordinate: "B1", value: null }],
        },
      })?.fields,
    ).toEqual([]);
  });
});
