# Planilha operacional Limpax — esclarecimento do titular03/10/2026

O titular declarou a planilha como coração da empresa e apresentou as abas
completas. O importador B2B genérico não cobre essa operação. As imagens
e o arquivo real ficam privados; este documento registra somente a estrutura.

## Destinos necessários

| Origem | Destino conceitual no CRM |
| --- | --- |
| CADASTRO: ID, nome, endereço, telefone | Identidade de origem, cliente pessoa/empresa, local de atendimento, contato |
| Valor, data/atendimento e observação | Histórico de atendimento vinculado ao cliente/local; não é cadastro novo |
| Abas específicas: loja/local, serviço, causa, quantidade | Histórico operacional por unidade/local e descrição original do serviço |
| Responsável/equipe e solicitante | Participantes do atendimento; não criar usuário nem convite automaticamente |
| Pagamento, número de NF e imposto | Referências históricas financeiras/documentais; não emitir nota nem presumir quitação |
| Mês, dia da semana, blocos mensais e total fechado | Organização e fechamento de período; não transformar total em atendimento |
| CALENDARIO | Ferramenta auxiliar; não contém clientes a importar |

As abas de serviços não são descartáveis. A recusa anterior de abas com células
mescladas/títulos ausentes é limitação do leitor genérico, não indicação de
que esses dados não importam. Datas em intervalos/múltiplos dias, valores
ausentes, linhas sem nome e marcadores de asteriscos devem ir para revisão.
Preservar conteúdo bruto e origem arquivo/aba/linha antes de normalizar.

## Regras de correlação

- Nome genérico não permite decidir pessoa física/empresa. Nunca preencher
  simultaneamente empresa, razão social, fantasia e pessoa sem decisão explícita.
- Mesmo nome/telefone/endereço não prova identidade; recorrência de serviço
  não é cliente duplicado. Não apagar atendimentos ao resolver identidades.
- Um cliente pode ter vários locais e atendimentos; uma equipe presta serviço
  para vários clientes. Solicitante é distinto de responsável pela execução.
- Cor/formatação pode ter significado operacional [VALIDAR]. Preservar origem
  e não atribuir status pelo preenchimento colorido sem regra confirmada.
- Valor não implica receita paga. Textos de pagamento mantêm evidência original;
  sua interpretação precisa regra administrativa. NF histórica não é emissão fiscal.

## Situação e próximo bloco

Leitura das9 abas comprovada03/10, incluindo CADASTRO4180 linhas/7 colunas úteis e ULTRABOX487 linhas. Colunas preenchidas sem título recebem nome provisório apenas na análise XLSM; nenhuma célula preenchida é descartada. Prévia classifica candidatos a cabeçalho/fechamento/registro/revisão e conserva células brutas. Gravação não executada.
A tela separa pessoa/contato e empresa e mostra destinos operacionais por coluna. Falta correlação editável de local, atendimento, equipe e financeiro histórico.
Antes de importar: revisão das sugestões por aba/linha, correlação de identidade,
recuperação isolada e migrações transacionais validadas. Gates anteriores
continuam vigentes. Este esclarecimento não comprova migração ou produção.
