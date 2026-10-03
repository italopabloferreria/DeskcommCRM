import { describe, it, expect } from "vitest";
import { operationalReview } from "./operational-review";
describe("revisão de linhas operacionais", () => {
  it("separa cabeçalho e fechamento sem descartar linhas nem inventar status", () => {
    const result = operationalReview({
      headers: ["NOME", "ENDEREÇO", "DATA/ATEND.", "OBSERVAÇÃO"],
      rows: [
        ["NOME", "ENDEREÇO", "DATA/ATEND.", "AGENDOU E FEX"],
        ["Cliente fictício", "Local", "45183", "serviço"],
        ["***", "Local", "12/05 E 14/05/26", ""],
        ["", "", "", "TOTAL FECHADO / NF 139"],
      ],
    });
    expect(result.total_rows).toBe(4);
    expect(result.counts).toEqual({ header: 1, closure: 1, record: 1, review: 1 });
    expect(result.sample[1]?.date_status).toBe("review");
    expect(result.sample[2]?.kind).toBe("review");
    expect(result.sample.map((row) => row.data_row_index)).toEqual([1, 2, 3, 4]);
  });
  it("não considera um cliente chamado Nome um cabeçalho repetido", () => {
    expect(
      operationalReview({ headers: ["Nome", "Telefone"], rows: [["Nome", "61999999999"]] }).counts
        .record,
    ).toBe(1);
  });
  it("conta o arquivo inteiro e limita apenas a amostra", () => {
    const result = operationalReview({
      headers: ["Nome"],
      rows: Array.from({ length: 4180 }, () => ["Teste"]),
    });
    expect(result.counts.record).toBe(4180);
    expect(result.sample).toHaveLength(25);
  });
});
