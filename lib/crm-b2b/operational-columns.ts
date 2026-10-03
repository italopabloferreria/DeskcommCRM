import type { SheetMatrix } from "./spreadsheet";
const destinations: Record<string, string> = {
  id: "Identificador na origem",
  nome: "Cliente — tipo a revisar",
  cliente: "Cliente — tipo a revisar",
  endereco: "Local de atendimento",
  local: "Local de atendimento",
  loja: "Unidade de atendimento",
  quadra: "Quadra do local",
  apartamento: "Apartamento do local",
  telefone: "Contato — telefone",
  data: "Data do atendimento — revisar",
  "data atend": "Data do atendimento — revisar",
  servico: "Descrição do serviço",
  causa: "Descrição do serviço",
  "referencia do servico": "Descrição do serviço",
  responsavel: "Equipe responsável",
  equipe: "Equipe responsável",
  solicitante: "Solicitante do atendimento",
  valor: "Valor histórico — não implica pagamento",
  pagamento: "Pagamento histórico — revisar",
  "n nf": "Referência de nota fiscal",
  "imp nf": "Imposto histórico",
  qte: "Quantidade do serviço",
  quantidade: "Quantidade do serviço",
  mes: "Período de referência",
  "dia semana": "Dia da semana original",
  observacao: "Observações do atendimento",
  obs: "Observações do atendimento",
  "agendou e fex": "Observações do atendimento",
};
export function operationalColumns(sheet: SheetMatrix) {
  return sheet.headers.map((header, index) => {
    const key = header
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
    return {
      header,
      destination: destinations[key] ?? "Sem destino — revisar",
      populated_rows: sheet.rows.filter((row) => (row[index] ?? "").trim() !== "").length,
    };
  });
}
