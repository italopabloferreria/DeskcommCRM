import { describe, expect, it } from "vitest";
import { planWorkbookBatches } from "./workbook-batches";

const hash = "a".repeat(64);
describe("origem dos lotes do workbook", () => {
  it("distingue abas, preserva células e reconcilia lotes sem decidir identidade", () => {
    const rows = [
      { sheet: "CADASTRO", row: 12, cells: [{ coordinate: "C12", value: "Teste" }] },
      {
        sheet: "Serviços",
        row: 12,
        cells: [{ coordinate: "D12", value: "=SUM(A1:A2)", cached: "10" }],
      },
      { sheet: "CADASTRO", row: 13, cells: [] },
    ];
    const plan = planWorkbookBatches(hash, rows, 1);
    expect(plan.rows).toBe(3);
    expect(plan.batches).toHaveLength(3);
    expect(new Set(plan.batches.map((batch) => batch.sha256)).size).toBe(3);
    expect(plan.batches.flatMap((batch) => batch.rows).map((r) => r.origin.row)).toEqual([
      12, 13, 12,
    ]);
    expect(plan.batches[2]?.rows[0]?.raw.cells).toEqual(rows[1]?.cells);
    expect(plan.batches[2]?.rows[0]?.identity).toBe("pending");
    expect(planWorkbookBatches(hash, rows, 1)).toEqual(plan);
  });
  it("rejeita coordenada repetida antes de preparar carga", () => {
    const row = { sheet: "Cadastro", row: 2, cells: [] };
    expect(() => planWorkbookBatches(hash, [row, row])).toThrow("Origem repetida");
  });
  it("divide acima2000 sem truncar nem renumerar a origem", () => {
    const rows = Array.from({ length: 4180 }, (_, i) => ({
      sheet: "Cadastro",
      row: i + 3,
      cells: [],
    }));
    const plan = planWorkbookBatches(hash, rows);
    expect(plan.batches.map((batch) => batch.rows.length)).toEqual([2000, 2000, 180]);
    expect(plan.batches[2]?.rows[179]?.origin.row).toBe(4182);
  });
  it("recusa limites e hashes inválidos", () => {
    expect(() => planWorkbookBatches("bad", [])).toThrow();
    expect(() => planWorkbookBatches(hash, [], 2001)).toThrow();
  });
});
