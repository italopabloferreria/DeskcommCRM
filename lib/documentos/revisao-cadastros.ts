export interface LinhaHistorica {
  origem: { arquivoSha256: string; aba: string; linha: number };
  nome: string;
  telefone: string;
  endereco: string;
  /** Não converter valores ambíguos nem descartar observações/atendimentos. */
  historico: Record<string, unknown>;
}
export interface CandidatoDeRevisao {
  evidencia: "nome_telefone" | "nome_endereco" | "nome" | "telefone_compartilhado";
  linhas: number[];
  decisao: "revisar";
}
export function normalizarIdentidade(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/\s+/g, " ")
    .trim();
}
/** Aceita UM telefone brasileiro com DDD. Nunca junta dois números ou inventa DDD. */
export function telefoneParaRevisao(raw: string): string | null {
  if (!/^[+\d\s().-]+$/.test(raw)) return null;
  let digits = raw.replace(/\D/g, "");
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith("55"))
    digits = digits.slice(2);
  if (!/^[1-9]\d[2-9]\d{7,8}$/.test(digits)) return null;
  return digits;
}
export function revisarCadastros(linhas: readonly LinhaHistorica[]) {
  if (linhas.length > 50_000) throw new Error("revisao_limite_linhas");
  const origens = new Set<string>();
  const grupos = new Map<
    string,
    { evidencia: CandidatoDeRevisao["evidencia"]; linhas: number[] }
  >();
  const add = (evidencia: CandidatoDeRevisao["evidencia"], key: string, index: number) => {
    const id = JSON.stringify([evidencia, key]);
    const group = grupos.get(id) ?? { evidencia, linhas: [] };
    group.linhas.push(index);
    grupos.set(id, group);
  };
  linhas.forEach((linha, index) => {
    const { arquivoSha256, aba, linha: numero } = linha.origem;
    if (
      !/^[a-f0-9]{64}$/.test(arquivoSha256) ||
      !aba ||
      !Number.isSafeInteger(numero) ||
      numero < 1
    )
      throw new Error("revisao_origem_invalida");
    const origem = JSON.stringify([arquivoSha256, aba, numero]);
    if (origens.has(origem)) throw new Error("revisao_origem_repetida");
    origens.add(origem);
    const nome = normalizarIdentidade(linha.nome);
    const endereco = normalizarIdentidade(linha.endereco);
    const telefone = telefoneParaRevisao(linha.telefone);
    if (nome) add("nome", nome, index);
    if (nome && telefone) add("nome_telefone", JSON.stringify([nome, telefone]), index);
    if (nome && endereco) add("nome_endereco", JSON.stringify([nome, endereco]), index);
    if (telefone) add("telefone_compartilhado", telefone, index);
  });
  const candidatos: CandidatoDeRevisao[] = [];
  for (const group of grupos.values()) {
    if (group.linhas.length < 2) continue;
    if (
      group.evidencia === "telefone_compartilhado" &&
      new Set(group.linhas.map((i) => normalizarIdentidade(linhas[i]!.nome))).size < 2
    )
      continue;
    candidatos.push({ ...group, decisao: "revisar" });
  }
  // Buckets independentes: nenhuma união transitiva; nenhuma linha/campo é alterado.
  return { linhas, candidatos, fusoesAutomaticas: 0 as const };
}
