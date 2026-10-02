import { describe, expect, it } from "vitest";
import {
  importColumnCoverage,
  importPreview,
  mappingError,
  uncoveredImportColumns,
} from "./import-preview";
import { exportCsv } from "./export-csv";
import { parseImportFile } from "./spreadsheet";
describe("revisão de planilhas", () => {
  it("encontra dados além da amostra e mantém zero como valor preenchido", () => {
    const sheet = {
      headers: ["Nome", "Endereço", "Valor", "Vazio"],
      rows: Array.from({ length: 6 }, (_, i) => [
        "Cliente fictício",
        i === 5 ? "Rua fictícia" : "",
        "0",
        "  ",
      ]),
    };
    const preview = importPreview(sheet, { person_name: "Nome" });
    expect(preview.raw_sample.every((r) => r[1] === "")).toBe(true);
    expect(preview.unmapped_columns).toEqual([
      { header: "Endereço", populated_rows: 1 },
      { header: "Valor", populated_rows: 6 },
    ]);
  });
  it("recalcula a cobertura ao mapear e desmapear campos", () => {
    const coverage = importColumnCoverage({
      headers: ["Nome", "Email"],
      rows: [["Teste", "teste@example.invalid"]],
    });
    expect(uncoveredImportColumns(coverage, { person_name: "Nome", email: "Email" })).toEqual([]);
    expect(uncoveredImportColumns(coverage, { person_name: "Nome", email: "" })).toEqual([
      { header: "Email", populated_rows: 1 },
    ]);
  });
  it("permite mapear cabeçalhos desconhecidos e limita a amostra", () => {
    const sheet = {
      headers: ["Cliente", "Responsável"],
      rows: Array.from({ length: 8 }, () => ["Empresa fictícia", "Pessoa fictícia"]),
    };
    expect(
      mappingError(sheet.headers, { company_name: "Cliente", person_name: "Responsável" }),
    ).toBeNull();
    const preview = importPreview(sheet, { company_name: "Cliente" });
    expect(preview.total_rows).toBe(8);
    expect(preview.sample).toHaveLength(5);
    expect(preview.sample[0]?.company_name).toBe("Empresa fictícia");
  });
  it("recusa cabeçalhos repetidos, colunas inexistentes e mapeamento vazio", () => {
    expect(mappingError(["Nome", "Nome"], { person_name: "Nome" })).toBeTruthy();
    expect(mappingError(["Nome"], { person_name: "Outra" })).toBeTruthy();
    expect(mappingError(["Nome"], {})).toBeTruthy();
  });
  it("exporta Unicode, separadores e aspas sem executar fórmulas", async () => {
    const csv = exportCsv("companies", [
      { id: "demo", trade_name: 'São José; "Teste"', phone: "+5511999990000", legal_name: "=1+1" },
    ]);
    expect(csv).toContain("'" + "=1+1");
    expect(csv).toContain("'" + "+5511999990000");
    const bytes = new TextEncoder().encode(csv);
    const parsed = await parseImportFile(bytes.buffer as ArrayBuffer, "demo.csv");
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.sheet.rows[0]?.[2]).toBe('São José; "Teste"');
  });
});
