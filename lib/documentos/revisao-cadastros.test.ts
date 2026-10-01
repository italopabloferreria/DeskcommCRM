import { describe, expect, it } from "vitest";
import { revisarCadastros, telefoneParaRevisao, type LinhaHistorica } from "./revisao-cadastros";
const linha = (n: number, nome: string, telefone = "", endereco = ""): LinhaHistorica => ({
  origem: { arquivoSha256: "a".repeat(64), aba: "CADASTRO", linha: n },
  nome,
  telefone,
  endereco,
  historico: { idAntigo: "repetido", valorBruto: "100 / pendente", observacao: `serviço ${n}` },
});
describe("revisão de cadastros históricos", () => {
  it("preserva atendimentos e IDs antigos repetidos sem fundir homônimos", () => {
    const input = [
      linha(3, "José Silva", "61912345678", "Rua A"),
      linha(4, "JOSE SILVA", "61987654321", "Rua B"),
    ];
    const result = revisarCadastros(input);
    expect(result.linhas).toBe(input);
    expect(result.fusoesAutomaticas).toBe(0);
    expect(result.candidatos).toEqual([{ evidencia: "nome", linhas: [0, 1], decisao: "revisar" }]);
    expect(result.linhas[1]!.historico.observacao).toBe("serviço 4");
  });
  it("expõe telefone compartilhado por pessoas distintas", () => {
    expect(
      revisarCadastros([linha(3, "Ana", "+55 (61) 91234-5678"), linha(4, "Bia", "61912345678")])
        .candidatos,
    ).toContainEqual({ evidencia: "telefone_compartilhado", linhas: [0, 1], decisao: "revisar" });
  });
  it("não reúne três identidades por transitividade entre nome e telefone", () => {
    const result = revisarCadastros([
      linha(3, "Ana", "61912345678"),
      linha(4, "Ana", "61987654321"),
      linha(5, "Bia", "61987654321"),
    ]);
    expect(result.candidatos.every((c) => c.linhas.length === 2)).toBe(true);
  });
  it("recusa reprocessamento da mesma origem e exige hash/linha válidos", () => {
    expect(() => revisarCadastros([linha(3, "Ana"), linha(3, "Bia")])).toThrow(
      "revisao_origem_repetida",
    );
    expect(() => revisarCadastros([linha(0, "Ana")])).toThrow("revisao_origem_invalida");
  });
  it("não inventa DDD e não concatena múltiplos telefones", () => {
    expect(telefoneParaRevisao("912345678")).toBeNull();
    expect(telefoneParaRevisao("61912345678 / 61987654321")).toBeNull();
    expect(telefoneParaRevisao("6191234567861987654321")).toBeNull();
  });
});
