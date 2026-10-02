# Prévia de locais e histórico da Limpax

Status: implementada no fork, testes focados aprovados, sem implantação ou aceite visual hospedado. Não habilita carga real ou altera schema. O destino é o núcleo da análise B2B existente; funciona sem instalar outra extensão.

## Contrato entregue

`POST /api/v1/imports` com `preview=true` conserva o guard de manager, provisionamento B2B, validação do arquivo e limites existentes. Retorna a cobertura das colunas, `source_sha256` dos bytes enviados e `historical_review` quando reconhece cabeçalhos de endereço, valor, data de atendimento ou observação. Não acessa o banco para analisar e não emite auditoria de mutação fictícia.

`historical_review` contém contagens de linhas com endereço/dados de serviço, ausência de nome identificado, valores/datas para revisão, campos com múltiplas colunas equivalentes, colunas históricas preenchidas que bloqueiam a confirmação e até cinco amostras preenchidas. Cada amostra mantém os textos originais e `data_row_index`, posição na matriz lida. Essa posição NÃO é a linha original do Excel e não substitui a rastreabilidade completa do staging privado. O hash do arquivo pertence à resposta autenticada; nenhum conteúdo da planilha é colocado em logs ou documentação pública.

O servidor recusa a confirmação quando há colunas históricas reconhecidas e preenchidas, inclusive se forem mapeadas como nome/telefone. A cobertura geral continua recusando outras colunas preenchidas sem destino. Campos arbitrários fora dos aliases não têm significado inferido; escolher propositalmente um mapeamento errado para esses campos ainda exige revisão humana.

Valores textuais são interpretados somente quando inteiros não negativos ou decimais inequívocos com vírgula e até duas casas, dentro do limite inteiro seguro. O cálculo usa inteiro; falta não vira zero. Pontos, moeda, marcadores, negativos ou quantias fora do limite ficam para revisão. A interpretação não comprova pagamento nem preço atual.

Datas aceitam `DD/MM/AAAA` e `AAAA-MM-DD`, com validação de calendário. Números de série Excel, marcadores, datas impossíveis e anos anteriores a1900 ficam para revisão. Não se inventam horário, duração ou instante UTC. A futura data operacional usará America/Sao_Paulo sem presumir horário.

Cabeçalhos ambíguos não são escolhidos silenciosamente: são sinalizados, suas colunas preenchidas continuam bloqueadas e as contagens dos campos sem coluna única não são totalizações conclusivas. Linhas repetidas permanecem separadas. Contagens não representam identidades/localidades/serviços únicos ou concluídos.

## Consumidores e retorno em erro

- Entrada: upload e análise em `/app/imports`, depois handler autenticado `/api/v1/imports`.
- Domínio: `lib/crm-b2b/historical-preview.ts`, chamado pelo contrato de prévia e pelo bloqueio de confirmação.
- Saída: seção “Locais e histórico de serviços — somente revisão” da tela existente; botão de confirmação bloqueado para histórico reconhecido.
- Retorno em erro: `422 validation_failed` antes de cliente DB/RPC/efeitos; arquivo e prévia continuam disponíveis para revisão. Não agenda tarefas, dispara mensagens ou inventa eventos sem consumidor.
- Mapa vivo: `docs/architecture/crm-b2b-companies-people.architecture.json`; caminho API → prévia histórica → tela. Não existe caminho dessa prévia para tabela de serviços.

## Próxima implementação e gates

Reutilizar `import_batches/import_rows` para origem, sem cadastro paralelo de lotes. Definir armazenamento/vínculos de locais do cliente e serviços históricos antes de qualquer confirmação desses campos. `calendar_locations` descreve lugares da organização e não é cadastro de endereços do cliente; `calendar_appointments` exige horários e não é destino automático dessa planilha.

Proposta a detalhar: cliente revisado → local revisado → serviço por origem com data operacional, valor em centavos, observação e referência do lote. Tipo pessoa/empresa, vínculo ao contato, identidade e decisões de colisão vêm de revisão explícita. Nenhuma tabela foi criada nesta etapa. Persistência exige RLS, autorização, idempotência por origem, auditoria, provisão de módulo quando aplicável e migração incremental conforme doutrina.

Limites mantidos: somente CSV/XLSX, primeira aba, até2.000 linhas e2MB por arquivo. A XLSM original com nove abas foi conservada no staging privado; não é aceita diretamente pelo importador. Serial de data de XLSX permanece para revisão. Restauração isolada antes0495; carga real precisa de autorização específica; G13 permanece aberto. Teste de componente não equivale a navegador com Supabase real.


## Revisão estruturada de vínculos — 02/10/2026

A análise aceita campo multipart `historical_review` contendo JSON estrito de `historicalReviewSchema`: `source_sha256` do upload e até2.000 decisões por `data_row_index`. Cada decisão define `customer` (kind company/person e UUID), `location` (none/create_from_original/existing com UUID quando existente), `accept_original_date` e `accept_original_value`. Não aceita organização/papel no corpo. JSON inválido, fonte diferente, posição repetida/inexistente ou cabeçalhos ambíguos devolvem422 sem DB. Uma revisão em pedido de confirmação também é recusada.

O resultado `reviewed_draft` contém totais e até5 amostras; plano integral preserva cada linha e todas as células em memória. Ausências continuam nulas; dados inválidos permanecem em revisão mesmo com aceite. Endereço preenchido exige opção de local; endereço ausente não autoriza criar local. Repetir uma revisão produz o mesmo plano sem mesclar linhas: NÃO é prova de idempotência persistente/concorrência, que depende do próximo schema.

`ownership_verified=false` e `status=draft_only_not_importable` impedem confundir validação estrutural com autorização. Resolver os UUIDs e vínculos na organização é exigência antes da futura escrita. Não há API de gravação histórica, migração nova, editor de decisões na UI ou recibo persistido. Entrada: handler de prévia; domínio: historical-review.ts e extração bruta histórica compartilhada; saída: resposta autenticada e erro422. Não emite atividade fictícia nem altera CRM. Próximo: persistência/testes de banco isolado e editor/recibo.
