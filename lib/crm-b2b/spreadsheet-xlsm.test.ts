import { strToU8, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { parseImportFile } from "./spreadsheet";

function workbook(rows = 2): ArrayBuffer {
  const sheet = `<worksheet><sheetData><row><c r="A1" t="inlineStr"><is><t>Nome</t></is></c></row>${Array.from({ length: rows }, (_, i) => `<row><c r="A${i + 2}" t="inlineStr"><is><t>Cliente fictício ${i}</t></is></c></row>`).join("")}</sheetData></worksheet>`;
  const zip = zipSync({
    "xl/workbook.xml": strToU8(
      '<workbook><sheets><sheet name="Cadastro" r:id="rId1"/><sheet name="Histórico &amp; serviços" r:id="rId2"/></sheets></workbook>',
    ),
    "xl/_rels/workbook.xml.rels": strToU8(
      '<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Target="worksheets/sheet2.xml"/></Relationships>',
    ),
    "xl/worksheets/sheet1.xml": strToU8(sheet),
    "xl/worksheets/sheet2.xml": strToU8(
      '<worksheet><sheetData><row><c r="A1" t="inlineStr"><is><t>Valor</t></is></c></row><row><c r="A2"><f>1+1</f><v>2</v></c></row></sheetData></worksheet>',
    ),
    "xl/vbaProject.bin": strToU8("synthetic macro content, never executable"),
  });
  return zip.buffer.slice(zip.byteOffset, zip.byteOffset + zip.byteLength) as ArrayBuffer;
}

describe("XLSM: análise explícita sem executar macros", () => {
  it("lê todas as 4180 linhas da aba para análise, sem fingir ser um lote importável", async () => {
    const result = await parseImportFile(workbook(4180), "cadastro.XLSM");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.sheet.rows).toHaveLength(4180);
    expect(result.workbook).toEqual({
      analysis_only: true,
      macros_executed: false,
      selected_sheet: "Cadastro",
      sheets: ["Cadastro", "Histórico & serviços"],
    });
  });
  it("permite escolher a aba e conserva o valor calculado em cache da fórmula", async () => {
    const result = await parseImportFile(workbook(), "cadastro.xlsm", "Histórico & serviços");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.sheet).toEqual({ headers: ["Valor"], rows: [["2"]] });
    expect(result.workbook?.selected_sheet).toBe("Histórico & serviços");
  });
  it("recusa aba inexistente e mais de10000 linhas, sem escolher outra ou truncar", async () => {
    expect((await parseImportFile(workbook(), "cadastro.xlsm", "Ausente")).ok).toBe(false);
    const result = await parseImportFile(workbook(10001), "cadastro.xlsm");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("10000");
  });
  it("mantém o limite de2000 para XLSX e recusa seleção de aba fora da análise XLSM", async () => {
    expect((await parseImportFile(workbook(2001), "cadastro.xlsx")).ok).toBe(false);
    expect((await parseImportFile(workbook(), "cadastro.xlsx", "Histórico & serviços")).ok).toBe(
      false,
    );
  });
});
