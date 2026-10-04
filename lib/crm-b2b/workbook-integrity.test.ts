import { describe, expect, it } from "vitest";
import { planWorkbookBatches } from "./workbook-batches";
import { verifyWorkbookIntegrity } from "./workbook-integrity";

const hash = "a".repeat(64);
const rows = [
  { sheet: "Cadastro", row: 12, cells: ["Fictício"] },
  { sheet: "Serviços", row: 12, cells: [{ formula: "SUM(A1:A2)", cached: "10" }] },
  { sheet: "Cadastro", row: 22, cells: ["Outro"] },
];
const prepare = () => planWorkbookBatches(hash, rows, 1).batches;
describe("integridade dos lotes privados", () => {
  it("aceita JSON salvo, distingue abas e conserva lacunas físicas", () => {
    expect(verifyWorkbookIntegrity(hash, 3, JSON.parse(JSON.stringify(prepare())))).toEqual({
      rows: 3,
      sheets: 2,
      batches: 3,
      database_writes: 0,
      ready_to_import: false,
    });
  });
  it("recusa perda de um lote", () => {
    expect(() => verifyWorkbookIntegrity(hash, 3, prepare().slice(1))).toThrow("Cobertura");
  });
  it("preserva metadados brutos e a ordem original das propriedades no hash", () => {
    const source = [{ provenance: { version: 1 }, sheet: "Cadastro", row: 12, cells: [] }];
    const batches = planWorkbookBatches(hash, source).batches;
    expect(verifyWorkbookIntegrity(hash, 1, batches).rows).toBe(1);
    expect(batches[0]!.rows[0]!.raw).toEqual(source[0]);
  });
  it("recusa alterações em células e fórmulas após a preparação", () => {
    const batches = prepare();
    batches[2]!.rows[0]!.raw.cells = [{ formula: "SUM(A1:A3)", cached: "10" }];
    expect(() => verifyWorkbookIntegrity(hash, 3, batches)).toThrow("alterado");
  });
  it("recusa repetição de lote e workbook errado", () => {
    const batches = prepare();
    expect(() => verifyWorkbookIntegrity(hash, 4, [...batches, batches[0]])).toThrow();
    expect(() => verifyWorkbookIntegrity("b".repeat(64), 3, batches)).toThrow("Origem");
  });
  it("recusa identidade aprovada embutida e contagens inválidas", () => {
    const batches = prepare();
    Object.assign(batches[0]!.rows[0]!, { identity: "approved" });
    expect(() => verifyWorkbookIntegrity(hash, 3, batches)).toThrow("inválida");
    expect(() => verifyWorkbookIntegrity(hash, -1, [])).toThrow();
  });
});
