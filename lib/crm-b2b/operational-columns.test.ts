import { describe, it, expect } from "vitest";
import { operationalColumns } from "./operational-columns";
describe("correlação operacional", () => {
  it("separa cadastro, serviço, equipe e financeiro sem decidir identidade", () => {
    const result = operationalColumns({
      headers: ["NOME", "ENDEREÇO", "DATA/ATEND.", "RESPONSAVEL", "PAGAMENTO", "N° NF", "OUTRO"],
      rows: [["Teste", "Local", "12/05 E 14/05/26", "Equipe", "OK", "123", "preservar"]],
    });
    expect(result.map((c) => c.destination)).toEqual([
      "Cliente — tipo a revisar",
      "Local de atendimento",
      "Data do atendimento — revisar",
      "Equipe responsável",
      "Pagamento histórico — revisar",
      "Referência de nota fiscal",
      "Sem destino — revisar",
    ]);
    expect(result.every((c) => c.populated_rows === 1)).toBe(true);
  });
});
