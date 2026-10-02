import { describe, expect, it } from "vitest";
import { historicalDate, historicalPreview, historicalValue } from "./historical-preview";

describe("prévia histórica sem efeitos", () => {
  it("preserva texto, origem lógica e linhas repetidas sem inventar entidades", () => {
    const row = ["7", "Cliente fictício", "Rua fictícia", "12,30", "29/02/2024", "Teste"];
    const result = historicalPreview({
      headers: ["ID", "NOME", "ENDEREÇO", "VALOR", "DATA/ATEND.", "OBSERVAÇÃO"],
      rows: [row, row],
    })!;
    expect(result.address_rows).toBe(2);
    expect(result.service_rows).toBe(2);
    expect(result.sample.map((r) => r.data_row_index)).toEqual([1, 2]);
    expect(result.sample[0]?.raw.address).toBe("Rua fictícia");
    expect(result.sample[0]?.value.cents).toBe(1230);
    expect(result.sample[0]?.date.date).toBe("2024-02-29");
    expect(result.status).toBe("review_only_not_importable");
  });
  it("conta o arquivo inteiro e não trata ausência como zero", () => {
    const result = historicalPreview({
      headers: ["Nome", "Valor", "Data/Atend."],
      rows: Array.from({ length: 7 }, (_, i) => ["", i === 6 ? "0" : "", i === 6 ? "45000" : ""]),
    })!;
    expect(result.service_rows).toBe(1);
    expect(result.unnamed_rows).toBe(1);
    expect(result.date_review_rows).toBe(1);
    expect(result.sample[0]?.data_row_index).toBe(7);
    expect(result.sample[0]?.value.cents).toBe(0);
    expect(historicalValue("").cents).toBeNull();
  });
  it.each(["1.200", "R$ 10", "PAGO", "-1", "9007199254740992", "9".repeat(10000)])(
    "deixa valor ambíguo ou fora do limite para revisão",
    (raw) => {
      expect(historicalValue(raw)).toEqual({ cents: null, status: "review" });
    },
  );
  it.each(["29/02/2023", "31/04/2024", "45000", "2024-02-30", "01/01/0099"])(
    "não inventa data ou horário",
    (raw) => {
      expect(historicalDate(raw)).toEqual({ date: null, status: "review" });
    },
  );
  it("aceita data ISO e valor inteiro sem ponto flutuante", () => {
    expect(historicalDate("2024-01-31").date).toBe("2024-01-31");
    expect(historicalValue("100").cents).toBe(10000);
  });
  it("não escolhe silenciosamente uma coluna ambígua", () => {
    const result = historicalPreview({
      headers: ["Nome", "Endereço", "Address"],
      rows: [["Teste", "Local A", "Local B"]],
    })!;
    expect(result.ambiguous_fields).toEqual(["address"]);
    expect(result.blocked_columns).toEqual(["Endereço", "Address"]);
    expect(result.sample).toEqual([]);
  });
  it("não altera planilha e não interfere em cadastro simples", () => {
    const sheet = { headers: ["Empresa", "Telefone"], rows: [["Teste", "61900000000"]] };
    const original = JSON.stringify(sheet);
    expect(historicalPreview(sheet)).toBeNull();
    expect(JSON.stringify(sheet)).toBe(original);
  });
});
