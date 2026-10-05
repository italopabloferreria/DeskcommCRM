## Login local lento e erro enganoso corrigidos —04/10/2026

Leituras opcionais de marca/cadastro agora abortam em2s mantendo fallback/política existentes. Página e casca públicas escolhem idioma do navegador sem consultar Auth; MFA/rotas privadas mantêm validação. Erro de transporte/status0/5xx no login retorna service_unavailable, não incrementa falhas da conta; credenciais inválidas continuam bloqueadas pelo orçamento existente. HTTP login200 em2,69s. Navegador testou formulário preenchido: mensagem correta de conexão indisponível. Health Supabase falhou Node/PowerShell/curl (timeout TCP5s); não prova senha incorreta nem projeto pausado. Sem mudança de senha/conta.
Validação:27 testes de branding/cadastro/prazo passaram +10 testes de login/fachada/transporte passaram, lint e diff check. Servidor3000 permanece aberto. Próximo: restabelecer conectividadeHTTPS ao Supabase, validar login real e PDFs, enviar commits aoGitHub. G13/VPS/HTTPS hospedado continuam pendentes.
## Arquivamento privado de PDFs — 04/10/2026

Implementado /api/v1/documents/archive e interface Salvar PDF no CRM: snapshot PDF da prévia, consulta paginada, download autenticado e vínculo opcional ao contato selecionado. Apenas administrador; organização autenticada no caminho Storage privado; contato validado via sessão/RLS, sem anonimizado. Envelope JSON imutável <=1MB, hash PDF e hash da requisição, replay sem sobrescrever o primeiro PDF. Auditoria document.created apenas na criação. Reutiliza bucket privado existente; sem migração ou mutação remota nesta etapa.
Testes de armazenamento9 e API4 passaram; testes UI3 passaram. Regressão da busca ajustada para mocks por URL, resultado final registrado abaixo. Lint direcionado aprovado. Sessão visual expirou e retornou login; gravação real autenticada ainda não validada. Typecheck integral continua limitado por memória. PDF é prévia identificada, não emissão fiscal nem assinatura eletrônica certificada.
Próximo executável: validar salvar/reabrir/baixar com sessão autenticada e conferir release; organizar vínculo explícito do histórico das outras abas. Bloqueios externos: VPS gratuita/HTTPS/WhatsApp hospedado, G13 aberto. Roadmap: DocuSign e retorno manual Gov.br. CRM local3001 preservado.
## Ficha do contato e preenchimento de documentos — 04/10/2026

Contatos importados agora têm cartão de origem e aba Histórico da planilha, consultando import_rows já vinculadas ao contato. Mantém dados literais (inclusive datas múltiplas e fórmulas), exibe endereço, valor, atendimento e observações de CADASTRO sem presumir pagamento. GET /contacts/[id]/workbook usa sessão viewer, RLS, filtro explícito de organização/contato, paginação50; recusa contato anonimizado. Não mescla históricos entre nomes iguais. Tela autenticada conferida com registro real.
Documentos agora busca contatos e empresas, permite selecionar contato importado e preencher nome/endereço/telefone operacional; documento fiscal vazio para contato e revisão manual. Endereço/telefone nos resultados distinguem nomes repetidos. Busca real de contato conferida no navegador. Modelos e PNG persistem; PDF continua prévia, emissão definitiva/arquivo assinado ainda pendentes. 23 testes relevantes passaram e lint direcionado passou. Verificação integral de tipos permanece não aprovada pela limitação de memória registrada anteriormente.
Workflow ARM ampliado para acompanhar mudanças de contatos/importações. Próximo: conferir release final no GitHub e fechar persistência dos documentos emitidos; histórico de outras abas requer vínculo explícito de cliente. VPS/HTTPS e WhatsApp hospedado bloqueados por infraestrutura; DocuSign depende de configuração. G13 continua aberto. Nenhuma mutação remota nesta etapa.
## Consulta da base e histórico validada na interface — 04/10/2026

Sessão autenticada no navegador interno: contatos com tag Base Limpax visíveis, paginação com mais resultados e11 lotes reais exibidos. Detalhes dos lotes agora mostram aba, linha física e valores originais expansíveis (inclusive células tipadas e fórmulas literais). Serviço real de LOJAS MANGAÍ conferido na tela. Lista passa a identificar a aba de cada lote. API mantém guard viewer, organização e RLS existentes; nenhuma nova gravação ou migração nesta etapa.
Destino: extensão vertical Limpax sobre a consulta de importações existente. Entrada: Importações > lote. Saída: consulta de células preservadas; erros permanecem no aviso com Tentar novamente; sem worker ou efeitos externos. 27 testes de API/UI passaram; 5 testes do detalhe repetidos após correção das células tipadas; lint direcionado passou. Histórico operacional e revisão de identidades continuam pendentes. G13 aberto.
## Carga real concluída — 04/10/2026

Importação COMMIT no Supabase bzretxzwnudtpxmoqjyv: 4050 contatos nomeados da aba CADASTRO, 5050 linhas originais das 9 abas preservadas em 11 lotes. Reexecução verificada com ROLLBACK: 0 contatos novos, 5050 linhas reutilizadas. Nenhuma mesclagem automática; telefones ambíguos conservados no bruto para revisão. Histórico das outras abas preservado, ainda não convertido em serviços operacionais.
Backup anterior restaurado em PostgreSQL17 isolado: dados de222 tabelas,632 políticas e permissões conferidos. Isso valida recuperação do banco, não login Auth nem G13. Simulação remota passou antes do COMMIT. CRM local reiniciado em3001, HTTP200. Verificação visual bloqueada por timeout CDP no Chrome; não afirmar aceite visual. Próximo: conferir navegação autenticada e apresentar histórico operacional; hospedagem/HTTPS continuam pendentes.
# Retomada da vertical LimpaxCRM

## Preservação integral em lotes04/10

Planejador privado implementado em lib/crm-b2b/workbook-batches.ts: identidade
por hash do workbook, aba e linha física; lotes<=2000, hashes distintos e
rejeição de coordenada repetida/tamanho excessivo. Não decide identidade,
não chama RPC e não cria clientes.4 testes passaram, lint/tipos direcionados
aprovados. Não foi repetido typecheck integral; módulo independente.
Prova real privada:5050 linhas com conteúdo,9 abas,11 lotes e51 fórmulas,
células brutas reconciliadas integralmente com staging checksum verificado;
original intacto,0 escritas. Inclui cabeçalhos e auxiliares, não5050 clientes.
Preparação Supabase oficial PG17 isolado obtida no discoD; configuração
privada restringe banco a768MB/1CPU e loopback. Nenhum banco foi criado:
Docker Linux não inicializou, API500 e logs de init ping/socket indisponível.
Tentativa interrompida e processos Docker/WSL próprios encerrados; CRM3001
permanece HTTP200. Bloqueio anterior de política não se repetiu ao clone.
Revisão de código confirmou que0495 une identidades por nome/telefone e0507
não distingue abas no SHA/índice. Não aplicar esses caminhos à planilha real
sem contrato de origem e identidade explícita. XLSM permanece análise apenas.
Próximo: caminho de gravação por origem sem mescla automática e confirmação
integral; recuperação em Supabase compatível; migração/aceite/carga reconciliada.

## Carga real autorizada03/10 — estado confirmado

Pedido explícito: importar toda a base real e preparar publicação. Autorização
não está pendente. Consulta administrativa READ ONLY/ROLLBACK confirmou13
empresas,13 pessoas,15 contatos,0 lotes,0 funções B2B de importação e ausência
de limpax_service_history. Nenhuma migração/gravação neste bloco.
Restore isolado permanece pendente. Preparação local de Docker/repositório
oficial rejeitada pela revisão automática, sem razão específica retornada;
quota gratuita Supabase permanece impedimento registrado. C agora cerca12GB
livres; sem limpeza realizada. WAHA auto-iniciado com Docker foi parado. CRM3001 estava parado depois da interrupção; uma única instância Next reiniciada, GET/login200 confirmado.
Próximo: provar recuperação, ensaiar/aplicar0495/0507, resolver correlação sem
mesclar nomes, carregar/reconciliar origem inteira; HTTPS/aceite antesG13.

## Revisão operacional por linha03/10

Prévia inclui contagens de possíveis registros, cabeçalhos repetidos,
fechamentos e linhas/datas para revisão. Nenhuma classificação exclui linhas;
conteúdo bruto permanece preservado. XLSM permite análise de colunas sem
nome com títulos provisórios únicos; CSV/XLSX mantêm validação estrita.
Teste privado leu as9 abas:4180/260/487/9/18/3/10/63/8 linhas.
CALENDARIO é auxiliar, não cadastro. Original inalterado; zero escrita no banco.
45 testes passaram; lint direcionado e typecheck integral aprovados.
CRM3001 aberto, tela sem arquivo selecionado: aceite visual da nova seção
pendente; upload automatizado permanece bloqueado pela extensão.
Próximo executável: mapeamento operacional editável e revisão de identidades;
carga exige recuperação isolada e validação das migrações0495/0507. G13 aberto.
## Correlação operacional implementada03/10

UI separa Pessoa/contato de Empresa; API de prévia acrescenta
operational_columns com destinos sugeridos e contagem integral de cada coluna.
Reconhece cadastro/local/serviço/equipe/solicitante/financeiro histórico;
desconhecidos vão para revisão. Não é gravação nem mapeamento histórico editável.
Planilha real revalidada: CADASTRO4180 linhas;7 destinos; original inalterado.
26 testes em3 arquivos aprovados, lint direcionado aprovado. Typecheck integral aprovado.
Chrome confirmou grupos novos com prévia anterior. Reanálise seguida de HMR
reinicializou upload; tabela nova ainda não recebeu aceite visual final.
Servidor3001 ativo. Nenhuma escrita/migração, convite ou mensagem.
Próximo: revisão por linha/aba com títulos repetidos, fechamentos e datas
Excel; depois recuperação/migrações/carga. Contrato operacional permanece
em docs/LIMPAX_OPERATIONAL_WORKBOOK.md; G13 aberto.

## Esclarecimento operacional do titular03/10

Planilha é cadastro + histórico de serviços + locais + equipes + pagamentos
e referências NF. Não tratar abas específicas como descartáveis. Ler
docs/LIMPAX_OPERATIONAL_WORKBOOK.md antes de alterar mapeamento/importação.
UI atual B2B genérica ainda não cobre esse modelo; nenhuma correção de
mapeamento implementada após o envio das imagens. Nome genérico e cores
não autorizam inferir tipo de cliente/status. Servidor3001 HTTP200 mantido.

## Teste solicitado com planilha real — 03/10/2026

Titular autorizou testar arquivo da pasta Documentos e corrigir erro2000.
Leitor real executado sobre o original XLSM: CADASTRO4180 linhas; encontrou
coluna sem título totalmente vazia que bloqueava a validação de cabeçalho.
Corrigido descarte somente de colunas sem título e sem dados em todas as
linhas. CADASTRO agora4180 linhas/7 colunas úteis/zero cabeçalhos vazios.
Original406280 bytes e hash inalterados, macros não executadas, zero escritas
no banco. Recibo privado real-workbook-result.json fora do Git.
Análise CSV/XLSX até10000 linhas também implementada, com regressão RED/GREEN;
38 testes em4 arquivos passaram. Confirmar acima2000 bloqueado na UI antes
de falhar no servidor; carga continua por lotes e não é análise XLSM.
Duas abas auxiliares ainda contêm dados fora de colunas tituladas: recusa
explícita; não truncar nem considerar abas auxiliares cadastros novos.
Gravação real permanece NÃO executada: RPC0495 não instalada e recuperação
isolada não comprovada; endereços/histórico exigem contrato0507 revisado.
Autorização de testar/carga existe; não substitui esses pré-requisitos de
integridade. Próximo executável é comprovar recuperação, validar/aplicar
migrações condicionadas e então confirmar lotes reais com rastreabilidade.

## Aceite autenticado complementar — 03/10/2026

CRM3001 HTTP200 e Chrome autenticado. Arquivamento recuperável executado
pela interface na conexão órfã antiga terminada615887; saiu da lista e
persistiu após reload. Número do titular preservado; outra conexão não
verificada preservada. Contagem caiu3 para2; banner atualizado após reload.
Não há WAHA ativo, QR operacional ou logout remoto comprovado.
Imagem de evidência privada fora do Git: conexoes-arquivamento-20261003.png.
Textos agora distinguem conexões cadastradas de conectadas e limites por
formato. Lint direcionado e19 testes da UI passaram. Typecheck anterior
aprovado; alteração complementar apenas texto/traduções.
Upload sintético XLSM pelo conector bloqueado pela permissão da extensão
para arquivos locais; não afrouxada. Teste automatizado comprova4180 linhas,
seleção de aba, cache de fórmula, recusa10001 e preservação do limiteXLSX.
Oracle segue na tela de autenticação: sem novo resultado de capacidade.

## Correções XLSM e conexão órfã — 03/10/2026

XLSM aceito para análise por aba até10000 linhas, sem executar macros nem
recalcular fórmulas. Carga XLSM bloqueada no servidor e UI; CSV/XLSX mantêm
2000 linhas. Nenhuma importação real realizada. Conexões QR agora oferecem
Arquivar no CRM: preserva histórico e configurações, exige administrador,
mesma origem/organização e conexão sem operação em andamento; não chama
WAHA nem desconecta aparelho. Fluxo normal de desconexão permanece separado.

Validação:99 testes em7 arquivos passaram; lint direcionado passou; diff
sem erros. Typecheck aprovado; aceite autenticado pendente.
Servidor na3001 porque3000 está ocupada por outro projeto do titular;
login LimpaxCRM confirmado no Chrome. Não parar o outro projeto.
Oracle03/10 pediu login antes da verificação de capacidade; último erro
comprovado é falta de capacidade A1 em02/10. Nenhum recurso pago criado.
Render Free suspende após15min sem tráfego e não oferece disco persistente:
não substitui VPS contínua do WAHA. Vercel Hobby restringe uso comercial.
Fontes: https://render.com/docs/free e https://vercel.com/docs/plans/hobby.
G13 aberto; restauração isolada e aceite hospedado precedem carga real.

## Documentos e dados: verificação local e localização dos módulos — 02/10/2026

Servidor conferido antes do trabalho: /login HTTP200; Next dev mantido ativo.
Chrome autenticado verificou /app/documents: busca de modelos retornou
“Acervo atualizado”; busca da empresa fictícia [DEMO] Horizonte preencheu o
nome. Variáveis de cliente/data foram preenchidas; ausência de data recusada
na UI. POST /api/v1/documents/preview HTTP200; documento-previa.pdf baixado
(2252 bytes, uma página), texto extraído e render visual conferido sem cortes.
Espera de download do conector expirou, mas arquivo e resposta200 confirmaram
sucesso. Modelo não salvo; sem upload de original/PNG real, migração ou importação.
Presença usual da interface permanece automática.

Caminho verificado: CRM > Ver tudo em CRM (/app/crm): Empresas/Pessoas em
“O dia a dia da venda”; Importações em “Preparar a venda”; Documentos em
“Fechar a venda”. PNG assinatura/carimbo e OCR estão dentro de Documentos.
Links da central e tela de Documentos mantidos no Chrome externo. Painel
interno tem sessão independente; não presumir que esteja autenticado.

Implementado: OCR local pt-BR para PDF textual/escaneado e PNG/JPEG; revisão
para texto editável/variáveis; modelos e imagens versionados em Storage
privado; prévia PDF com posições por página. OCR não reproduz fielmente o
layout original; arquivo original não é arquivado. PNG é sobreposição visual,
sem assinatura criptográfica. Gov.br é portal externo/manual; DocuSign não
conectado. Prévia emitida não é arquivada nem recebe numeração definitiva.
Base real XLSM preservada em staging privado:4148 linhas com nome não são
4148 clientes únicos; nenhuma mesclagem/importação operacional realizada.
Vínculos de empresa/pessoa/contato e locais/histórico precisam revisão explícita.

Próximo executável: provar restauração integral isolada antes0495/0507;
aceite local de documentos não fecha G13 nem substitui aceite hospedado.
Bloqueios externos: quota gratuita de destino Supabase e capacidade A1 Oracle.
Roadmap: arquivo de emitidos/retorno assinado, DocuSign, OpenRouter, fiscal,
domínio crm.limpaxdf.com.br. Evidências sintéticas privadas fora do Git.

## Visualização local retomada — 02/10/2026

Pedido do titular: abrir o CRM para acompanhar e sempre conferir o servidor
local antes de iniciar os próximos trabalhos. Regra permanente registrada
nos AGENTS.md do site e do fork. Substitui a restrição anterior de Next OFF;
Docker/WAHA/workers/crons continuam desligados. Uma instância Next dev do
fork atual em127.0.0.1:3000, heap Node limitado a2048 MB, processo inicial4152
e listener3556; logs privados fora do Git. Assets OCR preparados das deps
locais. Não utilizar build30/09 para representar o código atual.
Chrome externo abriu http://localhost:3000/app/companies com sessão já
autenticada: tela Empresas carregou12 empresas[DEMO] e1[TESTE]. API companies
HTTP200. Presença normal da interface executou automaticamente; nenhum
seed/importação/migração/convite realizado. A abertura no painel Codex foi
enfileirada; a visualização efetiva foi verificada no Chrome. Servidor mantido
ativo para acompanhamento. G13 continua aberto; disponibilidade local não
comprova aceite hospedado. Oracle recusou A1 por capacidade nesta data.
Próximo executável: acompanhar/revisar telas locais mantendo o servidor;
gate de dados ainda exige restauração integral antes0495/0507. Bloqueios
externos: VPS Oracle e destino separado gratuito Supabase. Roadmap posterior:
DocuSign, OpenRouter, fiscal e domínio crm.limpaxdf.com.br.

## Preparação da recuperação concluída — 02/10/2026

Autorização: continuar o máximo possível sem consultas repetidas. Código
`436ec8f32` enviado ao fork. Backup rechecado; captura real por TLS
verificado / REPEATABLE READ / READ ONLY / ROLLBACK: 186 tabelas public,
27 auth, 8 storage, 1 vault; 632 políticas; zero objetos Storage e segredos Vault.
820 ACL + 24 DEFAULT ACL no arquivo, preservando as 844 do recibo. Hashes de
conteúdo, estrutura e permissões de 222 tabelas ficam em manifesto privado;
ACL Windows do arquivo/credencial verificada como somente proprietário.
Nenhum dado pessoal, dump ou credencial publicado. Nenhuma escrita no banco.

CLI `scripts/limpax-recovery-preflight.ts` recusa arquivo alterado, projeto
incorreto, banco ativo/legado como alvo, saída no checkout, sobrescrita e captura
filtrada por RLS; descarta opções PG herdadas, mantém ambiente e exige TLS.
Comparação detecta mudança mesmo com igual contagem e mantém restore_proven=false.
[CI aprovado](https://github.com/italopabloferreria/DeskcommCRM/actions/runs/37049387074): tipos completos, lint dirigido, 49 contratos e
PostgreSQL 17 sintético (conteúdo alterado, readonly e filtragem RLS recusados).
81 testes locais de contratos/documentação/workflows passaram; 18 rechecados
na ferramenta após correção. Falha inicial 37048453572 era NODE_ENV exigido pela
augmentação Next de ProcessEnv; corrigida preservando ambiente, sem relaxar testes.

Bloqueio confirmado no dashboard: conta atingiu dois projetos gratuitos ativos;
criação de novo projeto desabilitada. Nenhum projeto pausado/removido, upgrade,
Docker/Next local, migração, carga real, convite, deploy ou alteração DNS.
Próximo executável: obter destino separado privado compatível sem cobrança,
coordenar snapshot/backup e comprovar restauração/login; depois preflight 0495/0507.
Ferramenta não prova sequências, atributos/memberships de papéis, configuração
Auth/login, chaves externas ou recuperação de arquivos/WhatsApp. Essas provas
continuam exigidas antes de G13. Oracle/VPS/HTTPS e aceite hospedado pendentes.
Runbook: `docs/runbooks/limpax-recovery-preflight.md`;
evidência: `docs/evidence/limpax-recovery-readiness-20261002.json`.
Roadmap posterior: arquivo definitivo de emissões, DocuSign, OpenRouter, fiscal
e domínio crm.limpaxdf.com.br. Seções seguintes são histórico quando divergirem.

## Confirmação e reversão histórica concluídas — 02/10/2026

Código aprovado e enviado ao fork `vertical/limpax`: `ce20a41a0`.
A revisão exige aceite explícito; o servidor revalida origem, papel, suporte,
hash e decisões antes da RPC atômica. Recibo durável identifica o lote e evita
repetição. A ficha pagina 50 linhas; admin pode reverter serviços logicamente,
preservando clientes/locais/origem. Alterações posteriores recusam reversão do
lote inteiro; replay não recria serviços anulados. Erro no audit desfaz efeitos.

Fonte 0507, baseline e MANIFEST preparados; provisionador opcional explícito.
Nenhuma migração no banco operacional, importação real, deploy ou serviço local
pesado iniciado. Testes descartáveis não comprovam restauração do backup ativo.
[Validação GitHub](https://github.com/italopabloferreria/DeskcommCRM/actions/runs/37042326064): 52 casos distintos em PG15/17 (104 execuções),
372 contratos de API/interface por versão. Governança completa: typecheck,
ESLint (0 erros/464 avisos), canais, papéis e
17213 testes unitários aprovados de 17216 em 1690 arquivos,
além de 1 falha esperada e 2 pulados preexistentes. Nenhuma asserção eliminada.
As bancadas iniciais encontraram incompatibilidade do kit antigo com políticas
opcionais, tipagem TS2532 de UI e três gates de governança. Consolidado o
provisionador, enumeradas fontes reais no export LGPD e explicitado filtro de
organização/pessoa em cada consulta; o helper recebe resultados paginados simples,
sem vazar genéricos do SDK. Correções revalidadas sem exceções de guard.

Inventário técnico privado concluído nos quatro diretórios declarados:
346 originais preservados; 9 abas/5.050 linhas/51 fórmulas mantidas no staging.
3 grupos de arquivos idênticos não são duplicidade de clientes; zero mesclagens
ou exclusões. Filas de identidade/endereço/serviço/auxiliares continuam separadas.
Relatório público só agrega contagens. Caminhos/checksums/dump permanecem privados;
backup rechecado e íntegro. Titularidade indireta e retenção continuam [VALIDAR].

Próximo passo executável: provar recuperação integral num Supabase separado
compatível e privado; depois preflight/ROLLBACK 0495/0507, instalação autorizada,
aceite hospedado e revisão/carga real autorizada. Sequência preparada em
`docs/runbooks/limpax-history-activation.md`. Sem inferência de identidade por nome,
truncamento de abas/linhas ou reativação do importador parcial. G13 permanece aberto.
Bloqueios externos: destino separado de restauração; Oracle gratuita sem
capacidade na última consulta registrada, VPS/IP/HTTPS ausentes; aceite visual hospedado não executado.
Futuro: arquivo definitivo das emissões/retorno assinado, DocuSign, OpenRouter,
fiscal e domínio `crm.limpaxdf.com.br`.
Evidência: `docs/evidence/limpax-history-confirmation-20261002.json`.
Seções seguintes são histórico quando divergirem desta.

## Bloco contínuo de histórico — estado conferido em02/10/2026

Autorização: “faça todo o bloco non stop”. Código no fork DeskcommCRM, branch vertical/limpax,
revisãoe531c7133 enviada ao GitHub. Bloco implementado: pessoa sem contato tem exportação
administrativa de cadastro/vínculos/linhas/locais/serviços e anonimização explícita; fichas de
pessoas/empresas incluem histórico paginado; correção manager/admin confere versão e conserva
origem; admin pode excluir logicamente e anonimizar pessoa sem telefone ativo.
Recibos, replay, locks e audit são atômicos. Guardas impedem restaurar conteúdo pessoal
por cadastro, vínculo empresarial, linha importada ou telefone. JSON/PDF inclui estado corrente.
API valida origem, suporte, papel, consulta e64KiB. Prévia Documentos respeita suporte readonly.

[Prova GitHub](https://github.com/italopabloferreria/DeskcommCRM/actions/runs/36987396496):43/43 casos emPG15/job110775434079 ePG17/job110775434076,
86 execuções de43 casos distintos;263 contratos de API/UI/export/mapa/navegação por job.
Governança completa aprovada: typecheck, ESLint, canais, papéis e 17.168 testes unitários aprovados de 17.171, além de1 falha esperada e2 pulados preexistentes.
A primeira suíte geral em36983371952 encontrou23 falhas, corrigidas sem pular asserções:
idioma/datas, tokens de UI, menu sem rolagem, UUID fora de HTTPS, registros de workflows/
Storage/portais ITI/RPC opcional e fixture de suporte.132 traduções adicionadas.
Documentos permanece no hub CRM e na busca; acesso pelo menu “Ver tudo em CRM”.
Os registros deliberados de RPC ausente devem sair da lista quando a migração canônica existir.
Testes focados de telas:18 aprovados; os demais gates afetados aprovados localmente.
A varredura de namespace necessita Linux; o Bash/grep não está funcional neste Windows.

Estado operacional: SQL continua somente em supabase/drafts; nenhuma instalação, migração,
carga real, alteração DNS ou deploy desta revisão. Sem funções instaladas, o módulo informa
indisponível. Teste de componente não substitui aceite visual autenticado hospedado.
Export direto declara person_profile_and_history, não todos os módulos do CRM.
Arquivos/staging/exports/backups e PII empresarial/auxiliar exigem tratamento próprio;
nenhum prazo automático de retenção foi inventado. Cobertura técnica conferida no fork:
docs/specs/limpax-history-privacy-coverage.md; inventário privado de cópias ainda pendente.

Próximo executável: Inventariar cópias externas e registros sem person_id, registrando as decisões pendentes de titularidade; obter destino Supabase compatível descartável e provar restauração antes0495/alocação canônica do histórico.
Bloqueios externos: Oracle gratuita sem capacidade, VPS/IP/HTTPS ainda inexistentes;
aceite hospedado eG13 abertos. Futuro: arquivo definitivo de emissões/retorno assinado,
DocuSign/OpenRouter/fiscal e domínio crm.limpaxdf.com.br.
Serviços locais pesados permanecem OFF. Notas abaixo são histórico quando divergirem desta
seção; não refazer os comandos/API/UI e testes do bloco já implementado.

## Exportação do histórico pessoal implementada — 02/10/2026

Fork commit6c135415c enviado a origin/vertical/limpax. Coletor LGPD existente resolve contacts.person_id e chama history-export.ts com organização confiável; busca locais/serviços filtrados por organização e pessoa. Lote limpax_history sinaliza dados do módulo: sem lote não lê tabelas opcionais; com lote, ausência/permissão/erro aborta coleta, nunca export parcial. Valida escopo/registro, preserva bruto/zero/nulo/redacted_at, pagina até resposta vazia com passo baseado em quantidade retornada; limite10.000 por tabela e16MiB total recusa sem truncar. Não é snapshot transacional; futura escrita concorrente exige prova adicional.

JSON recebe b2b.historico_limpax. PDF entregue inclui todos os locais/serviços e bruto/observações, não só contagem. Conferência do worker mostrou que e-mail atual entrega PDF eJSON fica no Storage, corrigindo a suposição de entrega dos dois. Teste gera e extrai texto do PDF.27 testes em6 arquivos aprovados, incluindo coletor real e regressão de propostas; tipos focados6 arquivos aprovados e lint sem avisos. Fixture de fontes de PDF normalizada paraWindows/Unix após falha; asserções preservadas. Nenhum envio real, DB operacional, migração, carga ou deploy.

Próximo executável: tratamento de pessoas sem contato vinculado e correção/expurgo explícitos; completar PII indireta em empresa/auxiliares/cópias de arquivos e política de retenção antes de migração/API de confirmação. Restore antes0495, VPS gratuita/HTTPS, aceite hospedado/G13 continuam gates. Não declarar ciclo LGPD completo; prova PostgreSQL24/24 em15/17 da etapa anterior permanece específica aos rascunhos, não ao export por PostgREST.

## Limpeza LGPD do histórico provada em rascunho — 02/10/2026

Commit4cabcf574 enviado ao fork. Novo limpax_history_lifecycle.sql estende o evento existente de anonimização de contacts (0449) às cópias pessoais de serviços/locais: limpa bruto/referência/nota/data/valor/moeda/endereço e marca redacted_at, preserva recibo/origem para impedir restauração por replay. Triggers internos revogados dos papéis da API recusam inserção de local/serviço para pessoa com contato já anonimizado. Nenhuma migração aplicada foi editada; nada instalado no Supabase operacional.

GitHub36972680702: PG15/job110729792432 ePG17/job110729792647 SUCCESS; logs conferidos24/24 em cada versão,48 execuções de24 casos distintos. Seis novos casos de limpeza/replay/bloqueio/escopo/rollback/grants, mais18 regressões de storage/atomicidade. Baseline install/update e158 políticas dos três kits aprovados. Lint focado aprovado. Prova no fork docs/evidence/limpax-history-lifecycle-20261002.json; contrato docs/specs/limpax-history-lifecycle.md.

Limites: não há export completo do histórico do titular, portão para pessoa sem contato, tratamento de PII indireta em empresas/auxiliares, prazo de retenção ou comando de correção/expurgo. IDs/hash retidos não são anonimização matemática. Rascunho não é módulo LGPD completo nem migrado. Próximo executável: integrar export autorizado dos locais/serviços e provar erro fail-closed/tabela opcional/isolamento; completar demais limites antes de alocar migração/API de confirmação/recibo. Sem carga/deploy/serviços pesados. Restore antes0495, VPS gratuita/HTTPS, aceite/G13 continuam gates.

## Bancada histórica PostgreSQL aprovada — 02/10/2026

Proprietário autorizou explicitamente a correção da fixture protegida e repetição. Commit34bff39ed enviado: somente leitura de auditoria como dono do DB descartável, importação como manager,18 casos/asserts e permissões do produto preservados. DESKCOMM_GOV_INVARIANTS_EDIT limitado ao commit autorizado.

GitHub36971628633: sucesso nos jobs110726614106 (PG15) e110726614164 (PG17). Logs conferidos:18/18 por versão,36 execuções de18 casos distintos; armazenamento8/8 e atômico10/10, instalação/reaplicação baseline ON_ERROR_STOP aprovadas e158 políticas declaradas verificadas nos três kits. Lint focado aprovado. Evidência docs/evidence/limpax-history-postgres-20261002.json. A falha17/18 anterior é registro histórico, superado nesta execução.

Próximo: ciclo de correção/anonimização/expurgo integrado ao LGPD existente, alocação canônica da migração, API de confirmação e recibo. Rascunhos não são migrações instaladas; confirmação histórica permanece bloqueada. Sem Supabase operacional, carga real, deploy ou serviços pesados locais. Restauração antes0495, VPS gratuita/HTTPS, aceite hospedado/G13 continuam gates.

## Publicação e prova PostgreSQL parcial — 02/10/2026

Proprietário respondeu continuar ao pedido específico de envio público; auto-review aprovou. Commit6664e1fc8 enviado; workflow corrigido e69c17c56a enviado. Primeira bancada36967197223 falhou antes de testes por descoberta de release no fork. A correção busca tags públicas upstreamv1.69.0 (latest conferida) e v1.63.0, mantendo as verificações do kit.

Rodada36967438149: Postgres15 descartável, baseline install/reapply aprovados e158 regras dos três kits conferidas.18 casos executados:17 aprovados,1 falhou. Armazenamento8/8, atômico9/10. Replay/auditoria falha na observação feita sob manager, que não lê api_audit_log sob policyadmin. Não afirmar que auditoria faltou, nem ampliar permissões do produto para resolver fixture.

Patch fora do teste protegido em docs/reviews/limpax-history-audit-fixture.patch + justificativa.md: observar log como dono do DB descartável, preservar importação como manager e todas as18 verificações. Ainda NÃO aplicado. Regra freeze-invariants.sh congela invariante já versionado; autorização específica de exceção solicitada e pendente. Não contornar guard ou trocar suite para esconder falha.

Prova sanitizada: docs/evidence/limpax-history-postgres-partial-20261002.json. Sem Supabase operacional, dados reais, deploy ou serviço pesado local. Após autorização: aplicar só fixture, registrar exceção, repetir banco15/17, depois ciclo LGPD e alocação de migração antesAPI/confirmação. Recuperação antes0495/Oracle/HTTPS/aceite/G13 continuam gates.

## Commit local e aprovação de publicação pendente — 02/10/2026

Commit6664e1fc8 local criado com38 arquivos de análise/revisão, rascunhos SQL/testes e workflow de bancada. GitHub API confirmou fork público. Push NÃO realizado: auto-review recusou exposição pública do payload completo, exigindo autorização inequívoca. Pedido específico enviado; aguardar resposta do proprietário. Não contornar com outra ferramenta/rota.

25 testes focados de tela/API aprovados; rodada editor/mapa/workflow209 aprovada; lint sem avisos e tipos focados aprovados. Sem aceite visual real, migração, carga, deploy ou serviços pesados.18 casos PostgreSQL continuam preparados e NÃO executados, porque workflow ainda só existe localmente. Próximo após aprovação: enviar exatamente6664e1fc8 e acompanhar a prova em DB efêmero; corrigir resultados antes de migração/confirmar. Este registro de bloqueio é alteração documental local posterior ao commit, ainda não enviado.

## Editor histórico implementado — 02/10/2026

/app/imports agora oferece revisão temporária por páginas de25 linhas, busca explícita de empresa/pessoa nos endpoints existentes filtrados por organização, cliente por linha, opção de endereço e aceite de data/valor. Decisões persistem apenas em memória entre páginas; trocar arquivo/sair descarta. Revalidação reenvia arquivo+hash+decisões somente preview=true. Resposta de outra fonte é recusada. Não escolhe homônimos automaticamente e não confirma escrita. Locais já existentes ainda não são oferecidos porque seu schema não está instalado; inválidos/ambíguos precisam de correção no arquivo.

POST/imports aceita historical_page somente na prévia,25 linhas e limite de páginas calculado; permite revisar além das cinco amostras originais sem liberar DB.25 testes de tela/API aprovados; nova rodada editor+mapa+permissões209 aprovados; lint focado sem avisos e tipos focados aprovados. Aceite visual real/hospedado NÃO realizado e nenhum servidor pesado iniciado.

Workflow .github/workflows/limpax-historico-db.yml preparado para banco efêmero no runner padrão ubuntu-24.04 do fork público, em push limitado aos rascunhos/testes ou dispatch manual. Publicidade do fork confirmada via API GitHub. Sem Supabase secrets/deploy/publicação de imagens; nenhuma prova PostgreSQL já obtida. O plano de enviar esta etapa e executar a bancada não equivale a aprovação dos18 casos. Registrar o resultado real depois.

Próximo: verificar execução remota dos18 casos, corrigir falhas, definir ciclo de vida/LGPD e alocar migração canônica; depois autorizar vínculos e ligar confirmação/recibo/histórico do cliente. Recuperação antes0495, VPS gratuita/HTTPS eG13 continuam gates.

## Preparação do lote e rascunho atômico — 02/10/2026

Implementado lib/crm-b2b/historical-command.ts: converte revisão validada em lote completo, conserva cabeçalhos/células/campos originais, separa serviço/local sem serviço/auxiliar, mantém nulo/zero e recusa qualquer questão pendente, nomes de arquivo inválidos ou excesso sem truncar. Não aceita organização/ator no payload e não inventa moeda ou linhagem original. NÃO ligado à confirmação/API; status prepared_only_not_enabled e ownership_verified=false.37 testes em três arquivos aprovados (7 novos), lint e tipos focados aprovados.

Rascunho supabase/drafts/limpax_history_atomic.sql: função exige sessão manager/admin aceita, não revogada, e trava de suporte; lock transacional compartilhado com0495; hash da decisão calculado no banco; replay devolve recibo sem novo efeito/auditoria; mesma fonte/decisão diferente gera conflito. Sem catch por linha: erro aborta todas as escritas do comando. Receipt e auditoria apenas com IDs/contagens. Provisionador rascunhado passa a criar recibos com RLS/grants restritos e acrescentar kind limpax_history ao CHECK atual de import_batches. Checar upstream/PRs antes de transformar em migração canônica, especialmente esse CHECK compartilhado.

Dez casos adicionais em tests/invariants/limpax-history-atomic-draft.test.ts preparados, incluindo segunda conexão, falha na última linha, replay/conflito e negativos de payload/papel. SQL e18 casos PostgreSQL (8 anteriores+10 novos) NÃO executados; atomicidade/concorrência/RLS não comprovadas. Bancada exige container/template/reset e loopback; o arquivo atômico deixa somente fixtures fictícias no DB efêmero, com efeitos de cada teste revertidos, e a bancada descarta esse DB. NÃO executar em ambiente operacional. Comando futuro: pnpm test:db tests/invariants/limpax-history-storage-draft.test.ts tests/invariants/limpax-history-atomic-draft.test.ts.

Bloqueio incidental resolvido: disco C estava sem espaço; removido exclusivamente .next/cache (1.061.437.166 bytes) do fork após verificar caminho absoluto. Fontes/planilhas/backup preservados. Sem Docker/Next/build pesado, conexão remota, commit/push ou deploy. Evidência docs/evidence/limpax-history-atomic-draft-20261002.json.

Próximo: executar/corrigir prova PostgreSQL descartável, completar negativos do ciclo de vida/expurgo LGPD, depois migração canônica e ligação servidor/editor/recibo com hash real do upload. Recuperação comprovada antes0495, VPS gratuita/HTTPS, aceite visual hospedado eG13 permanecem abertos.

## Rascunho de armazenamento histórico — 02/10/2026

Preparados supabase/drafts/limpax_history_provisioner.sql e tests/invariants/limpax-history-storage-draft.test.ts. SQL NÃO é migração, não está no baseline/MANIFEST e não foi aplicado. Provisionador fixo sem parâmetros cria locais de cliente e serviços históricos; guardas conferem cliente/local/origem na mesma organização, cliente único company OU person, centavos inteiros, dados brutos e unicidade por origem. RLS de leitura por organização; escrita direta do navegador revogada. Unicidade não equivale a recibo idempotente: comando atômico, auditoria, replay/conflito e concorrência continuam pendentes.

Oito testes de PostgreSQL preparados, com duas organizações fictícias realmente populadas, negativos de vínculos, permissões, reaplicação e rollback final. Entram somente na bancada test:db; guardas exigem container, template, porta local e marcador de reset da bancada. Não editar invariantes existentes. Comando futuro em ambiente descartável: pnpm test:db tests/invariants/limpax-history-storage-draft.test.ts. NÃO executar na instalação operacional, nem iniciar Docker local sob a restrição de RAM.

Verificado: TypeScript focado, ESLint e diff --check aprovados. PostgreSQL NÃO executado; sintaxe/semântica SQL e eficácia de RLS ainda não comprovadas. Há cliente psql portátil, mas não servidor postgres/initdb local. Nenhum banco remoto, dado real, servidor pesado, commit, push ou deploy nesta etapa. Evidência sanitizada: docs/evidence/limpax-history-storage-draft-20261002.json.

Próximo: executar e corrigir a bancada descartável; completar operação atômica/recibo e provas de replay/concorrência antes de alocar migração canônica (conferir upstream/PRs) e conectar API/editor. Definir correção/expurgo LGPD e validar limites sem truncamento. Restauração comprovada antes0495; capacidade gratuita/HTTPS, aceite hospedado eG13 permanecem abertos.

## Revisão histórica estruturada implementada — 02/10/2026

historical-review.ts valida schema estrito, origem SHA-256, posição, cliente/local escolhidos e aceite de data/valor. Integrado ao POST/imports somente preview=true; forma de UUID não prova existência/organização. ownership_verified=false; draft_only_not_importable.51 testes focados/5 arquivos aprovados e14 do validador repetidos após reforço; lint/tipos focados aprovados. Todos os dados mantidos em memória; resposta amostra5/totais. Não aceita revisão como confirmação de escrita. Editor de decisões UI e persistência NÃO implementados. Próximo: provisionador/migração, provas isoladas de RLS/replay/atomicidade, autorização de vínculos/editor/recibo. Gates recuperação/0495/VPS/HTTPS/G13 mantidos. Contrato em C:\Users\italo\Programação\Limpax\docs\LIMPAX_HISTORY_STORAGE_CONTRACT.md.


## Continuação verificada — 02/10/2026

Leitor CSV/XLSX recusa dados além do cabeçalho antes de truncar: zero preservado, extras vazias permitidas.42 testes focados em5 arquivos, lint e tipos focados aprovados. Persistência histórica ainda NÃO implementada. Contrato fechado em C:\Users\italo\Programação\Limpax\docs\LIMPAX_HISTORY_STORAGE_CONTRACT.md; próximo: validação das decisões revisadas, provisionador/migração e provas isoladas antes de confirmação. Não houve migração/carga/serviço pesado/deploy. Aceite visual eG13 abertos.


## Prévia de locais e histórico implementada — 01/10/2026

Fork: historical-preview.ts integrado à análise B2B e à tela /app/imports. Mostra endereço/data/valor/observação originais, contagens completas, campos ambíguos e posição lógica dos registros. SHA-256 do upload na resposta autenticada; não confundir posição lida com linha Excel original. Datas impossíveis/serial Excel e valores ambíguos ficam para revisão; zero distinto de falta. Histórico reconhecido bloqueia confirmação no servidor mesmo quando mapeado como nome.41 testes focados em5 arquivos, tipos e lint focados aprovados. Sem escrita DB, migração, carga real ou deploy. Aceite visual hospedado pendente; Next/Docker OFF. Contrato no fork: docs/specs/limpax-historical-import-preview.md; prova docs/evidence/limpax-historical-preview-20261001.json. Próximo: contrato de persistência com cliente revisado→local revisado→serviço histórico por origem, reutilizando import_batches/import_rows; prover RLS/idempotência/auditoria antes de liberar confirmação. Recuperação isolada antes0495; Oracle sem VPS/HTTPS; G13 aberto.

## Staging privado executado — 01/10/2026

Preparação privada concluída e verificada: nove abas/5.050 linhas não vazias/51 fórmulas preservadas; CADASTRO4.180 linhas (4.148 com nome,8 operacionais sem nome,24 auxiliares).600 grupos de nomes repetidos,73 de ID,575 de telefone candidato,291 nome/endereço,2 de conteúdo operacional idêntico; grupos não são duplicatas confirmadas. Nenhuma união, exclusão ou escrita remota. Original XLSM intacto; macros não executadas. Artefatos com PII fora do Git: C:\Users\italo\.codex\limpax-private\data-staging\2026-10-01. Recibo e mapa sanitizado: C:\Users\italo\Programação\Limpax\docs\LIMPAX_STAGING_REVIEW.md. CSV é instrumento de revisão, não arquivo pronto para carga.

Próximo executável de dados: classificar pessoas/empresas e preservar múltiplos locais/serviços, confrontando entidades existentes no fork antes de implementar extensões. Revisar grupos por origem, nunca só nome/telefone. Planejar pelo menos três lotes de origem, mantendo entidades e serviços separados. Não importar pelo fluxo atual que omite endereço/data/valor/observação. Recuperação isolada e0495 continuam gates; Oracle sem VPS/IP/HTTPS,Google novo desativado,aceite hospedado eG13 abertos. Não iniciar Docker/Next pesados.


## Plano vigente de entrada em uso — 01/10/2026

Mapa consolidado e plano solicitados pelo proprietário: C:\Users\italo\Programação\01_PROJETOS\DeskcommCRM\docs\superpowers\plans\2026-10-01-limpax-entrada-em-uso.md. Sequência: staging privado sem escrita remota; ambiente/recuperação comprovada; preflight/ROLLBACK0495 e aplicação condicionada; instalação da release2a35ef53c/HTTPS; aceite autenticado; carga real somente com autorização específica; depois documentos definitivos, assinatura externa, IA/fiscal/domínio. Enquanto Oracle não tem capacidade, staging e plano de cobertura de campos podem avançar sem Docker pesado. Este planejamento NÃO aplica migração, importa clientes, convida ou publica. Notas subsequentes são histórico quando divergirem do resultado atual: última criação A1 recusada por capacidade; franquia200 GB/uso0 comprovada; nenhuma VPS/IP/HTTPS; Storage documental sintético real aprovado; publicação ARM concluída; restauração e aceite hospedado pendentes; G13 aberto. Google do novo Supabase ainda desativado. Push no GitHub não implanta automaticamente na futura VPS.

## Release documental pronta para instalar

Workflow36947068509 SUCCESS: gates, testes Documentos, distribuição dos assets OCR, Compose, suite shell, builds e sondas ARM concluídos. Três imagens publicadas e metadados GHCR lidos anonimamente: arquitetura arm64 e revisão2a35ef53cb4297c553b22b2e941eae536ae64e4f conferidas. Manifesto docs/releases/limpax/2a35ef53c-arm.json, prova docs/evidence/limpax-documentos-release-20261001.json. Nenhuma VPS/HTTPS/deploy foi realizada; G13 aberto. Próximo: instalação do manifesto quando houver capacidade gratuita e aceite autenticado da tela.


## Storage real verificado — 01/10/2026

Teste sintético no Supabase isolado aprovado: salvamento/leitura de modelo com assinatura e carimbo PNG, nomes do catálogo, replay idempotente, duas versões imutáveis e recusa de outra organização. Nove policies existentes verificadas. Download anônimo/upload anônimo/download público bloqueados; leitura SQL sob papel authenticated com claims transitórios do proprietário bloqueada. Nenhum usuário ou sessão criado; isso NÃO é aceite HTTP autenticado da tela. Bucket documentos-privados preparado, privado; arquivos fictícios removidos e ausência comprovada. Sem migration, importação real ou alteração do banco antigo.

Prova reproduzível: scripts/validate-document-storage.ts, recibo docs/evidence/limpax-documentos-storage-20261001.json. Credenciais ficam apenas em variáveis de ambiente; a senha atual no arquivo privado autorizado é o valor avulso, não a URI antiga. Não registrar seu conteúdo. Lint/tipos focados e 17 testes de publicação/permissões aprovados.

Workflow ARM passa a testar Documentos, preparar/verificar assets OCR e construir a revisão no GitHub, sem Docker/Next pesado local. Publicação de imagens não equivale a hospedagem; VPS grátis continua sem capacidade e G13 aberto. Build/publicação e manifesto da revisão2a35ef53c conferidos; próximo: instalar e realizar aceite de tela autenticada em ambiente hospedado. Arquivo de emissões/retorno assinado e DocuSign continuam futuros.


## Entrega atual: OCR, modelos e imagens reutilizáveis

Implementado no fork: OCR em português dentro de /app/documents para PDF escaneado/PNG/JPEG, leitura direta de PDF com texto, revisão explícita e campos de cliente. Até 20 páginas de origem/10 MB, divididas sem truncar em até 40 páginas do editor. Busca de empresa cadastrada preenche nome/documento/telefone/endereço. Modelos, assinatura e carimbo são salvos juntos como versões JSON imutáveis no bucket privado documentos-privados, com hash e acesso pelo servidor/admin/organização. Replay não sobrescreve; auditoria registra a versão sem o conteúdo. Não cria tabelas ou modifica o módulo de propostas.

Provas: 234 testes relevantes aprovados (232 na suíte de sete arquivos, mais provisionamento privado e imagens duplicadas); navegador real com PNG fictício, PDF escaneado e PDF textual aprovados, confiança 95% na imagem, zero requisições externas. Lint e tipos focados aprovados. Assets OCR/idioma/PDF são copiados das dependências fixadas antes de dev/build; não dependem de CDN. Nenhum Next/Docker/build completo, importação real ou alteração remota executados.

Limites: extração não conserva automaticamente a diagramação original; revisão é obrigatória. Original fica com o usuário; só seu hash e texto do modelo revisado são salvos. Acervo paginado em 25 versões por consulta, sem truncamento silencioso. Persistência, bucket privado e round-trip sintético no Supabase real foram verificados; falta aceite HTTP autenticado da tela antes de uso. PDF ainda é prévia, sem arquivo de emissões/numeração/valor fiscal. DocuSign não conectado; Gov.br usa portal externo.

Próximo executável: aceite autenticado do fluxo de modelos/PNGs no Storage real e publicação da revisão quando houver ambiente disponível; depois arquivo de emissões e retorno de documentos assinados. Backup/restauração/0495/VPS/G13 mantêm os gates existentes.

## Descoberta documental concluída — 01/10/2026

O proprietário autorizou ler a pasta Documentos. Análise sanitizada: docs/LIMPAX_DATA_DISCOVERY.md no repositório Limpax. 346 arquivos; planilha XLSM com9 abas,4.148 linhas com nome na aba CADASTRO, que mistura cadastros e histórico. 1.751 nomes normalizados NÃO equivalem a clientes únicos;79 repetições excedentes de ID.326 PDFs/595 páginas abertos,10 sem texto;ZIPs inventariados e10 PDFs internos lidos,cinco com texto. Imagens/OCR e Word antigo permanecem leitura complementar. Não executar macros/atalhos. Originais intactos;Documentos ignorado no Git;extrações com PII privadas fora dos repos.

Importador atual aceita CSV/XLSX, primeira aba e até2.000 linhas; oito campos mapeáveis não incluem endereço/data/valor/observação de serviço. Próximo de dados: preparar staging privado e plano explícito de cadastro/contato/local/histórico sem perdas e sem importação remota. Backup real existe,restauração isolada/0495/aceite ainda pendentes;VPS gratuita sem capacidade;G13 aberto. Não criar módulos futuros ou transformar condições de contratos históricos em SLA/preço/licença atual.

## Estado verificado em 01/10/2026

- CRM ativo: C:\Users\italo\Programação\01_PROJETOS\DeskcommCRM, branch vertical/limpax. O repositório Limpax conserva o site público e o histórico; não expandir o CRM antigo.
- Banco isolado: Supabase bzretxzwnudtpxmoqjyv. A migração 20261001060000_0495_importacao_b2b_atomica.sql está preparada e NÃO aplicada. Nenhuma planilha real importada nesta etapa.
- Publicação ARM aprovada na revisão 68fe7e0de76a7c7213f247a28a213f27c7297697: 271 testes, lint, Compose real, suite shell e cinco sondas. Manifesto docs/releases/limpax/68fe7e0de-arm.json no fork; três imagens publicadas. Isso não comprova os fluxos com banco e WhatsApp reais.
- Rede Oracle exclusiva criada: limpaxcrm-vcn, limpaxcrm-publica, limpaxcrm-igw, rota e portas web 80/443. SSH fechado. Nova tentativa A1 2 OCPUs/12 GB/Ubuntu24.04 ARM/80 GB retornou capacidade insuficiente no AD-1 de São Paulo. Nenhuma VPS, IP ou HTTPS criado.
- Docker, Next e builds pesados locais permanecem OFF; volumes preservados. Recursos pagos proibidos. DNS oficial adiado; futuro endereço crm.limpaxdf.com.br. G13 aberto.

## Ordem de execução e condições

1. Credencial administrativa identificada no arquivo autorizado pelo proprietário e conexão postgres validada com certificado CA oficial e validação de hostname. Não expor senhas nem modificar o arquivo original. Ferramentas PostgreSQL17 portáteis obtidas da EDB; nenhum Docker/servidor iniciado.
2. Backup administrativo privado concluído em 01/10/2026: pg_dump17.11, arquivo custom de 2.614.004 bytes, checksum e decodificação integral aprovados; 186 tabelas public, 27 auth e 8 storage, 632 políticas e 844 ACL no arquivo. Papéis exportados sem senhas; Storage tem zero objetos. Recibo sanitizado no fork: docs/evidence/limpax-backup-20261001.json. Ainda falta restaurar em instalação Supabase descartável separada e verificar recuperação/login; o arquivo legível NÃO equivale a restauração comprovada.
3. Só após backup/restauração aprovados, executar preflight e teste sintético com ROLLBACK da0495; aplicar a migração somente se as provas passarem, conforme autorização já recebida.
4. Quando houver capacidade gratuita, concluir a VPS com a rede/chave públicas existentes, SSH temporário somente IP atual /32 e fechar após instalação. Rascunho Chrome3/920935687 preservado na última sessão; validar existência da aba antes de reutilizar. Não repetir criação em loop.
5. Seguir docs/runbooks/limpax-oracle-rollout.md do fork: copiar o manifesto para fora do checkout antes de fixar a revisão exata das imagens. Instalar serviços, validar HTTPS e aceitar login, importação/exportação, isolamento e WhatsApp no ambiente hospedado.

## Limites da autorização

Backup, preflight e teste sintético estão autorizados; aplicação0495 condicionada às provas. Não importar dados reais, convidar usuários, enviar mensagens, cobrar recursos ou alterar DNS nesta etapa. Não repetir testes/builds aprovados sem mudança ou falha nova. Não declarar produção enquanto G13 estiver aberto.

## Implementação disponível

Identidade LimpaxCRM/iCBAI, login/frontend padrão da base Deskcomm, módulos B2B/contatos/leads/tarefas/agenda e dados DEMO já instalados. Importação com mapeamento/prévia/confirmação e exports CSV implementados; aceite real e RPC0495 permanecem pendentes. Papéis administrativos controlam convites. OpenRouter e modelos gratuitos dependem da configuração/credencial e do aceite do fluxo de agentes; não ativar envio real nesta tarefa.

## Histórico preservado

As notas antigas não são instruções atuais: [HANDOFF-LIMPAX-before-consolidation-20261001.md](history/HANDOFF-LIMPAX-before-consolidation-20261001.md).

## Consulta Oracle — 01/10/2026

Chrome externo acessível. A sessão existente redirecionou ao formulário de login Oracle; capacidade atual NÃO verificada, nenhuma criação tentada nesta consulta, nenhum recurso/custo/porta alterado. Página mantida aberta para autenticação do proprietário. Última recusa por capacidade permanece histórica, não prova disponibilidade atual. Documentação oficial recomenda nova tentativa após espera ou outro AD disponível na região principal; não informa prazo garantido. Nenhum monitor periódico foi ativado. Próximo: autenticar e verificar criação A1 2 OCPUs/12 GB/80 GB somente com custo zero; depois instalação/HTTPS do manifesto 2a35ef53c. Servidores pesados locais permanecem desligados.
### Retomada Oracle após login informado pelo proprietário

A aba autenticada920935645 ficou no carregamento. Navegação direta para a lista Compute recuperou a conta, mas Oracle solicitou nova verificação FIDO/Windows Hello. Botão Verificar acionado; confirmação local do proprietário pendente. Capacidade ainda NÃO consultada, nenhuma VPS criada, nenhum custo/recurso/regra de rede alterado. Retomar essa aba após confirmação; não reutilizar URL com tokens de login. Contradições antigas sobre Storage sintético/publicação ARM foram corrigidas para refletir provas já concluídas.
### Oracle: franquia confirmada, formulário preparado

Após confirmação FIDO do proprietário, Compute em São Paulo mostrou zero instâncias no compartimento raiz. Limites Block Volume no AD-1: total-free-storage-gb-regional Active, limite200 GB, uso0 GB, disponível200 GB; conta Free Tier em avaliação. Ubuntu24.04 Minimal aarch64 e VM.Standard.A1.Flex elegível Always Free,2 OCPUs/12 GB, disco80 GB/VPU10/criptografia em trânsito preparados. Estimativa continuaR$17,80/mês para o disco, mas volume cabe na franquia oficial e na cota da conta comprovada. Ainda NÃO clicado Criar, capacidade não testada nesta retomada, nenhuma máquina/cobrança/rede alterada. Confirmação final de IP público/nova chave administrativa solicitada conforme política de controle do navegador. SSH permanece fechado; não aplicar abertura antes de necessidade/escopo confirmado.

Chave privada local fora do Git: C:\Users\italo\.codex\limpax-private\oracle-ssh\limpaxcrm_ed25519; ACL restringe acesso ao usuário Windows. Apenas a pública inserida no formulário. Evidência visual privada: C:\Users\italo\.codex\limpax-private\oracle-free-quota.png. Aba de criação Chrome3/920935645; não copiar URLs de autenticação com tokens. Manifesto para futura instalação permanece2a35ef53c.
### Resultado definitivo da tentativa autorizada Oracle

Proprietário confirmou criação gratuita/IP público/chave. Clique Criar executado no formulário A1 2 OCPUs/12 GB,Ubuntu24.04ARM,80 GB,VPU10,sub-rede limpaxcrm-publica,chave pública local,domínio de falha automático. Oracle retornou Erro de API: capacidade insuficiente VM.Standard.A1.Flex AD-1 São Paulo. Nenhuma instância/IP/HTTPS obtido; instalação não executada. Sem upgrade, custo pago, abertura SSH, DNS ou mudança Supabase. Franquia grátis200 GB/uso0 comprovada antes da tentativa; bloqueio atual é capacidade do datacenter. Não repetir mesma tentativa em loop. Evidência privada C:\Users\italo\.codex\limpax-private\oracle-capacity-refused.png; rascunho Chrome3/920935645 preservado. Próximo: nova tentativa em outro momento ou destino alternativo autorizado; recuperação isolada e aceite hospedado continuam pendentes. Nenhum monitor automático ativo.
## Filas privadas verificadas — 01/10/2026

Preparação avançou:4.148 entradas de revisão de identidade,4.156 de endereço,4.156 de serviço,24 auxiliares; não são entidades únicas confirmadas. Três lotes de origem2.000/2.000/180; dependências de grupos entre lotes explicitadas no manifesto privado. Cobertura4.180 linhas aprovada, sem união/escrita remota. Conferido no schema: reutilizar import_batches/import_rows; calendar_locations é local da organização,calendar_appointments exige horários ausentes. Não converter histórico em agenda nem inferir pagamento. Evidência: docs/LIMPAX_STAGING_REVIEW.md no repo Limpax. Próximo: contrato de locais/serviços históricos e prévia que bloqueie campos sem destino; identidade final ainda em revisão. Restauração/0495/Oracle/HTTPS/aceite/G13 mantêm gates.

## Proteção de cobertura implementada — 01/10/2026

Fork: import-preview.ts calcula colunas preenchidas em TODAS as linhas; prévia expõe contagens; tela lista colunas sem destino e bloqueia confirmação; POST/imports recusa confirmação incompleta antes de createClient/RPC/auditoria. Colunas vazias não bloqueiam.29 testes relevantes em5 arquivos aprovados; lint dos6 arquivos TS aprovado. Não importa endereço/local/histórico ainda e não valida a semântica de mapeamento deliberadamente incorreto. Não houve escrita remota, migração ou deploy. Prova no fork: docs/evidence/limpax-import-coverage-20261001.json. Aceite visual hospedado pendente; serviços pesados locais OFF. Próximo: contrato e prévia específicos para locais/serviços históricos, mantendo origem e decisões de identidade; restauração antes0495 eG13 aberto.

## Integridade da preparação — 04/10/2026
Verificador workbook-integrity implementado: valida hashes salvos, cobertura,
origem workbook/aba/linha, repetição e identidade pendente; conserva metadados
brutos e ordem serializada.10 testes passaram; tipos direcionados aprovados.
Prova privada dos11 arquivos:5050 linhas/9 abas, original SHA inalterado,
0 escritas. Consulta remota READ ONLY/ROLLBACK04/10:13 empresas,13 pessoas,
15 contatos,0 lotes;0495/0507/tabela histórica ausentes. Banco ativo responde;
não prova ausência de aviso futuro de pausa. Chrome inventaria abas mas bind
retorna Debugger unattached; Oracle/email não verificados nesta sessão.
Próximo: persistência por origem e identidade explícita, restore separado,
migrações/carga reconciliada. Não declarar MVP pronto nem carga concluída.
Checklist: entrada11 lotes privados; saída recibo privado de integridade;
sem mutação/auditoria de clientes; consumidor atual preparação privada,
não UI/RPC. Erros interrompem carga, não descartam origem. Peça interna
preparatória; nenhuma mudança no núcleo comum ou comportamento de VPS.

## Adaptador de origem histórica04/10
workbook-history-command.ts prepara comando histórico por hash de lote, não
hash global do workbook; original_reference conserva workbook/aba/linha
física e raw_data.workbook_source conserva bruto/fórmulas/metadados.
Valida integridade antes de decisões; preserva vínculo explícito pessoa/empresa
sem mescla automática. Limites reavaliados após acrescentar origem completa.
20 testes em4 arquivos passaram. Nenhuma RPC/migração/carga/tela ativada.
Local3001 estava parado; instância única Next iniciada e mantida.
Próximo: ligação da revisão por lote à UI e persistência; restore separado e
provas RLS/transação antes uso remoto. G13 permanece aberto.
Typecheck integral04/10 interrompido por consumo de3GB RAM; não afirmar aprovado.20 testes/lint direcionado passaram. Login3001 HTTP200 confirmado. Nenhuma carga realizada.

Verificação integral de tipos tentou2048MB e terminou por falta de memória; não aprovada nesta etapa. Não repetir ampliando RAM nesta máquina sem necessidade.

Validação final:18 testes direcionados e lint aprovados. GitHub indisponível nas duas tentativas de push; commit permanece local. Servidor3001 está escutando (processo10480), mas resposta/login falha por fetch de autenticação Supabase; HTTP final expirou20s. Não reiniciado nem encerrado. Retomar conexão externa, enviar commit e validar PDF autenticado antes de aceite.

## Diagnóstico adicional do login —04/10/2026

Servidor3000 mantido. URL local/Supabase corretas. DNS comparado com Cloudflare DoH coincide (172.64.149.246/104.18.38.10), hosts sem override, WinHTTP sem proxy. HTTPS Supabase projeto +supabase.com +github.com falham connecttimeout4s, example.com/CloudflareDNS respondem. Regras outbound ativas codex_sandbox_offline_block_outbound/loopback encontradas; provável restrição do ambiente, não alteradas/removidas. Não comprovada senha inválida/pausa do projeto; sem novas tentativas de credenciais nem mudança de conta. Correção de mensagem já aplicada. Próximo: sessão Codex com conectividade Supabase liberada e repetir auth; não contornar regras de isolamento. G13/aceite PDF dependentes.


Retomada04/10: nenhuma instância local3000/3001 escutava. Next do fork reiniciado único3000, sessão1974, HTTP login200/4,30s após inicialização. SupabaseHTTPS permanece timeoutTCP4s; não validado login real, não alterado firewall. Commits locais8f5b34976/c907bdc63 aguardam envio/rede. Próximo passo dependente: habilitar rede do ambiente pelo titular, validar Auth/PDF; sem mudança de dados.

## Correção do diagnóstico de rede —04/10/2026

Regras codex_sandbox_offline pertencem ao SID terminado1005; usuário do shell e dono do Next40168 é italo/SID1001. Não atribuir falha ao firewall Codex: hipótese anterior sem comprovação, nenhuma regra alterada. Windows Ethernet indica IPv4Connectivity3 (rede local) eIPv6Connectivity4 (internet); teste pareado curl Google:IPv4 connecttimeout4s/HTTP000, IPv6HTTP200. Supabase A104.18.38.10/172.64.149.246 falhaTCP, DNSconfere, gatewayIPv4192.168.1.1. Diagnóstico confirmado: acesso externo IPv4 falhando nesta conexão; localização entre PC/roteador/provedor ainda indeterminada. Corrigir conectividadeIPv4 (titular pode reiniciar roteador/modem ou testar rede alternativa) antes de validar Auth; sem trocar senha, banco ou contornar controles. Servidor3000 mantido.


04/10: titular pediu agente entrar. Executado clique Entrar com campos já preenchidos (sem ler/expor senha). UI terminou em serviço de login indisponível, sem autenticação. ContraprovaGoogle IPv4HTTP000/timeout4s vs IPv6HTTP200 repetida; gateway192.168.1.1 Reachable, endereço192.168.1.4. Não é formulário pendente; bloqueio de conectividade externaIPv4 persiste. Sem alterações remotas/credenciais. Próximo: restaurarIPv4 na rede, depois repetir login.



## Reteste após reinício — 04/10/2026
Titular informou reinício. Supabase HTTPS TCP expira5s/HTTP000; Google IPv4 expira4s/HTTP000. Nenhum listener3000/3001; iniciada única instância Next do fork3000, sessão13097, Ready1669ms. GET /login HTTP200 em3,99s. Login autenticado permanece não validado; acesso CUA à aba existente rejeitado pela política URL/protocolo, sem contorno. Não alteradas credenciais, firewall ou dados. Próximo: comparar conexão alternativa (hotspot) para localizar falhaIPv4, depois validar login/PDF e enviar commits locais. VPS gratuita/HTTPS hospedado/G13 ainda pendentes.


04/10 reteste após titular dizer hotspot não resolveu: SupabaseTCPtimeout5s/HTTP000; GoogleIPv4timeout5s/HTTP000; CRM3000HTTP200/2,37s. Get-NetIPConfiguration mostra apenas Ethernet192.168.1.4 gateway192.168.1.1 e vEthernet sem gateway; conexão alternativa não está ativa neste reteste. Titular autoriza reset senha se necessário, mas não executado pois falha precede Auth. Orientação: redefinição de rede Windows conforme suporte Microsoft, com aviso de reconexão/VPN/Hyper-V; não prometer correção e não alterar firewall/credenciais. Próximo comprovarIPv4 e então validar login; G13 aberto.


## Diagnóstico aprofundado na mesma rede — 04/10/2026
Titular recusou hotspot: trabalhar exclusivamente neste computador e rede. Next3000 continua HTTP200/2,38s. Testes independentes .NET conectam ao gateway192.168.1.1:80 em38ms, mas expiram4s em1.1.1.1:443,8.8.8.8:443 e DNS TCP53 externos; GoogleIPv6HTTP200. TracertIPv4 alcança gateway<1ms; hops2-6 silenciosos, sem provar ponto exato de queda. Rota defaultIPv4 única e correta; nenhuma rota VPN/Hyper-V concorrente, MTU1500, DHCPativo, adaptador sem erros/descarte. Bloqueios firewall seguem restritos SID1005, diferente deSID1001. Não atribuir falha ao DNS, senha ou Codex; WANIPv4/roteador/provedor é hipótese prioritária, filtro local ainda não excluído.
Chrome abriu painel ZTE F6201B emhttp://192.168.1.1, aba920938463, aguardando login administrativo solicitado ao titular. Nenhum ajuste roteador/firewall/Windows ou senha realizado. Próximo: conferir estadoWANIPv4 e diagnóstico do próprio roteador após login; só então corrigir o ponto identificado. Não insistir em hotspot nem repetir resetgenérico como solução comprovada. Auth/PDF/push eG13 pendentes.

## Conectividade recuperada após reinício do roteador — 04/10/2026
Titular reiniciou o ZTE pelo botão Reiniciar (sem factory reset). Reteste real: GoogleIPv4HTTP200/0,54s; Supabasehealth semapikeyHTTP401/0,45s (TCP67ms); health usando chave publicável localHTTP200. WindowsEthernet IPv4Internet eIPv6Internet. CRM3000/loginHTTP200/1,90s, servidor existente mantido. Falha de conectividade resolvida neste reteste; não prova causa exata PPPoE/NAT nem autenticação da conta. Não alteradas senha, firewall, dados ou configuraçãoWAN. Pedido anterior de hotspot recusado respeitado. Próximo: validar login real na3000, salvar/reabrirPDF e enviar commits pendentes. VPSgratuita/HTTPS/WhatsApp/G13 continuam pendentes.

## Desempenho local e Docker — 04/10/2026
Titular relata navegação lenta e Docker parado. Nextdev3000 existente mantido: loginHTTP200/0,41s; SupabasehealthHTTP401/0,12s(TCP37ms/TLS81ms). Máquina24GB RAM,9,46GB livres; processoNext~3,19GB, sem prova de faltaRAM. DockerDesktop/backend ausentes. Logs mostram APIs1-2s (channel-sessions~0,9-1s,contacts1,5s,counts1,35s); compilação on-demand Nextdev contribui, latência autenticada/consultas também. Não atribuir tudo ao Docker ou rede. GETdraft-reply retorna500: lib/agent-engine/db/request-pool.ts lança SUPABASE_DB_URL ausente; rotaGET não trata ausência. Erro/configuração real pendente, IA não configurada integralmente. Nenhum Docker/WAHA/worker/build iniciado, conforme cuidadoRAM. Próximo: tratar indisponibilidade rascunho/configuração e medir rotas lentas; WhatsApp precisaWAHA, navegaçãoNext/Supabase independeDocker. G13/produçãopendentes.

## Contatos: reconciliação e total visível — 04/10/2026
Auditoria remota somente leitura: 4050 contatos esperados da CADASTRO encontrados; 4065 contatos totais na organização (15 anteriores). Zero registros esperados ausentes ou divergências nos campos conferidos. 5050 linhas físicas preservadas, 11 lotes completos, sem falhas. CADASTRO tem 4182 linhas físicas: 4050 vinculadas a contatos, 132 sem contato; 868 linhas das demais abas são histórico/calendário preservado, ainda sem associação operacional integral. Nomes repetidos não foram fundidos automaticamente. Esta é importação de fotografia da planilha, não sincronização automática do Excel.
Corrigida apresentação da lista: API devolve total filtrado na primeira página com os mesmos filtros/RLS; interface separa quantidade carregada do total. Navegador autenticado confirmou Exibindo 25 de 4065 e, após Carregar mais, 50 de 4065. Não houve nova importação nem alteração remota de dados. 49 testes passaram em 6 arquivos; lint dos arquivos alterados passou. Evidência privada: C:/Users/italo/.codex/limpax-private/reconcile-live-summary-20261004.json e contacts-total-proof-20261004.png. Nenhuma PII incluída no repositório.
Próximo: revisar identidades ambíguas e associar histórico das outras abas; tratar erro de rascunho IA por SUPABASE_DB_URL ausente. VPS gratuita/WhatsApp hospedado e G13 seguem pendentes.
## Revisão de identidades e associação histórica — 04/10/2026
Executada revisão privada dos4050 contatos e868 linhas das outras abas.598 grupos com nomes repetidos;212 grupos com nome+endereço+telefone original coincidentes;3 grupos com todos os campos operacionais coincidentes. São candidatos, não duplicatas confirmadas.14 linhas históricas têm correspondência por endereço; nenhuma possui nome+endereço suficientes para vínculo inequívoco.852 linhas operacionais pendentes,7 cabeçalhos e9 auxiliares calendário; não assumir responsável/equipe/nome de aba como cliente.
Implementada tela /app/imports/identity-review acessível por Importações→Revisar identidades da base importada. API autenticada viewer, RLS e filtros de organização, consulta paginada1000 até10000 com cobertura parcial explícita, exclusão de anonimizados/mesclados, cache privado no-store. UI mostra20 grupos por vez e links à ficha/origem física. Nenhuma fusão, exclusão ou escrita remota. Navegador autenticado confirmou4050 contatos conferidos/212 grupos.23 testes passaram em4 arquivos, lint direcionado passou. Teste inicialmente reprovou telefone nacional; implementação corrigida adiciona55 antes da normalização canônica. Origem/telefone/endereço original preservados.
Arquivo de decisões privadas: C:/Users/italo/.codex/limpax-private/identity-history-review-private-20261004.json; resumo semPII: identity-history-review-summary-20261004.json. Próximo: associar locais/clientes comerciais explicitamente e validar persistência histórica antes de escrever; não declarar vínculo concluído. G13/VPS/WhatsApp hospedado permanecem pendentes.
## Bloco pré-VPS — 04/10/2026
Local3000 mantido HTTP200, somente Next. Correção GETdraft-reply: ausênciaSUPABASE_DB_URL retorna503 explícito após autorização/consulta tenant; painel interrompe polling em503, informa indisponibilidade e desabilita geração. Não configurada IA nem declarada otimização geral concluída.81 testes passaram em14 arquivos (45documentos/IA/revisão +36importação/exportação/histórico); repetição final da assistência5 testes passou; lint/diff aprovados. Não executado build/tipos integral (limiteRAM conhecido).
Aceite autenticado: preenchido documento fictício TESTE TÉCNICO — não utilizar, salvo viaUI, listado como PDF arquivado. Storage privado recuperado e SHA256/PDFheader verificados;1 objeto/1PDF copiado no backup privado. Sem vínculo a cliente real. UploadPNG naUI bloqueado pela extensão sem acesso a fileURLs; não alterada permissão. Download por UI excedeu espera e reinicializou controle; NÃO afirmar validado. PNG/renderização/modelos/privacidade validados nos testes.
Backup atual do banco after-import-pre-vps-20261004.dump:3651097bytes, SHA256d8355f98e0a29c94ef1cbefe68ef8f2b615b3a7799b1bb617a06935bd69682f2, catálogo pg_restore legível. Restauração deste NOVO backup NÃO executada. Backup anterior tinha restore isolado validado; não transferir esse aceite para o novo. Documentos privados copiados à pasta document-storage-pre-vps-20261004 com manifest privado/hash. Dumps/objetos/PII foraGit.
Pendências préVPS reais: associação histórica inequívoca depende de cliente/local confirmados (não usar equipe/nomeaba como cliente);212grupos candidatos não fundidos; restore isolado do snapshot atual e aceiteGUIPNG/download; teste completo dos fluxos reais/perfis e gateG13. VPS não resolve essas pendências. Nenhuma publicação/WhatsApp/VPS/DNS iniciada.

## Recuperação pós-importação e documentos — 04/10/2026, continuação
Banco after-import-pre-vps-20261004.dump restaurado exclusivamente em127.0.0.1:55439/limpax_restore_postimport_20261005:222 tabelas,632políticas,479funções,24ACL padrão conferidos.4050contatos/5050linhas/11lotes coincidem com plano privado,0ausências/alterações. ACL/proprietário vault corrigidos apenas no banco isolado; CHECK campanhas equivalente por árvore e900casos. Sem escrita no banco remoto durante recuperação; loginAuth na cópia não exercitado. Docker iniciado exclusivamente para recuperação, desligado ao final; Next3000HTTP200 mantido. Não confundir snapshot com novos modelos criados depois.
Navegador interno autenticado: assinatura/carimbo PNG sintéticos enviados; modelo salvo/reaberto com conteúdo e posições. PDF arquivado/baixado,hash coincideStorage,4objetosImagem noPDF. OCR de imagem de contrato fictício reconheceu4linhas; revisão obrigatória; modelo revisado salvo, cliente fictício preenchido, PDF arquivado/baixado, texto extraído confirma preenchimento. Não mede todo acervo real. ExportaçãoCSV real4065linhas contém todos4050IDsimportados. Storage privado copiado ao final:5objetos/3PDFs íntegros. Artefatos/PII emC:/Users/italo/.codex/limpax-private eDownloads, nuncaGit.
Limite: download direto da prévia porblob não confirmado (timeout); baixar arquivo persistido passou. Não concluirG13: bancada geral de perfis/edição ebuild/tipos integral continuam pendentes; associações históricas dependem decliente/local confirmados. Não unir212grupos candidatos nem atribuir equipe/nomeaba como cliente. Próximo executável: completar aceite de perfis/fluxos e verificações de release; externos:VPSgratuita/HTTPS/WhatsApp; roadmap:DocuSign/domínio definitivo.

## Verificação de release — 04/10/2026
GitHub: verificação ARM do commit88fbde5ec passou; publicação37253362489 parou em Conferir lint e fragmento. Reprodução local encontrou seis fragmentos .changes malformados (impacto corretivo fora do enum ou ausência de frontmatter). Corrigido somente formato/classificação e removidos headings inválidos; conferência release passou com33fragmentos. Workflow passa a disparar para .changes/**. Lint exato da etapa passou. Testes direcionados da publicação/versionamento em andamento; não afirmar publicação nova concluída atéCIconfirmar.

## Diagnóstico da bancada de documentos — continuação 04/10
Execução37255188247 passou no lint/fragmentos corrigidos e parou nos testes de documentos. Reprodução local:29passaram/2falharam/1erro; ambos na suíte antiga de modelos/imagens, pois a nova consulta inicial de PDFs arquivados consumia mocks sequenciais de modelos e criava alerta de URLrelativa dofetchNode. Fluxo realUI já passou. Ajuste restrito ao fixture: mock do componente ArquivosDocumentos nesta suíte; quatro casos e todas as assertions preservados; componente de arquivo tem suíte própria incluída na repetição. Não remover/excluir teste nem mudar produção para acomodar mock. Lint doarquivo e conferência35fragmentos passaram; aguardar9arquivos da repetição e novaCI. G13aberto.
Bancada repetida:41testes em9arquivos passaram, incluindo arquivos privados, modelos e imagens. Assertions originais preservadas; lint e release:conferir35fragmentos passaram.

## Marco concluído — 04/10/2026: recuperação, documentos e release
Publicação37255540881 SUCCESS do commit59713f3fb6db7011640d7b4ac78fc6211b1a49bf: gates de runtime, documentos/OCR, kit/shell, builds app/worker/scheduler e sondas ARM passaram antes de publicação. Verificação anônima GHCR de manifesto/config das três imagens confirmou linux/arm64, origem e revisão; sem camadas baixadas. Manifesto docs/releases/limpax/59713f3fb-arm.json validado com guarda de revisão exata. Runbook Oracle atualizado; guia docs/LIMPAX_OPERACAO_INICIAL.md preparado.
Nesta rodada: restore pós-importação (222 tabelas/632 políticas, 4050 contatos/5050 linhas/11 lotes), PNG/modelo salvo e reaberto, OCR de imagem fictícia→modelo revisado→PDF preenchido arquivado/baixado, CSV4065 com todos4050IDs importados e Storage5objetos/3PDFs íntegros. Lint exato passou;55 testes release/workflow e41 testes documentos passaram. Nenhuma fusão de clientes, vínculo histórico inferido, deploy ou DNS. Next3000 disponível, Docker desligado. BuildARM passou noCI; typecheck independente e aceite geral/perfis/instalação restaurada ainda não comprovados. Prévia direta blob não confirmada; arquivo persistido/download passou.
Próximo executável: concluir matriz funcional/perfis e recuperação da aplicação; bloqueios: vínculos comerciais inequívocos para histórico, hospedagem gratuita/HTTPS/WhatsApp; roadmap:DocuSign/domínio definitivo. G13 permanece aberto. Artefatos privados foraGit. Usar manifesto59713f3fb para futuro rollout, não os exemplos históricos antigos.

## Bloco 1 — 05/10/2026
Local desligado foi iniciado em uma única instância Next deste fork; login HTTP200. 166 testes em21 arquivos passaram (115+51); typecheck integral passou após guarda explícita em testes/unit/draft-reply-unconfigured.test.ts, sem remover assertions. Lint direcionado/diffcheck passaram. Quatro endpoints negam anônimo com401. Aceite visual novo bloqueado pela política da ferramenta ao selecionar aba existente; não contornar por outro navegador/superfície. MVP de apresentação ainda não declarado aprovado; G13 aberto. Matriz/evidência: DeskcommCRM/docs/LIMPAX_BLOCO_1_ACEITE.md. Próximo: cadastro/edição/busca e perfis em sessão real quando acesso normal da ferramenta for restabelecido; manter local3000. VPS custo zero/HTTPS/WhatsApp externos; DocuSign/Gov.br/IA/domínio roadmap.

### Continuação do bloco 1 — 05/10/2026
Acrescentada matriz explícita das16combinações viewer/agent/manager/admin em lib/auth/require-role.test.ts. Sessão declara admin enquanto papel efetivo vem do banco: teste verifica que downgrade não ganha privilégios antigos. Suíte25/25 passou, lint/diffcheck passaram. São16casos novos além dos166anteriores; não somar repetição dos9existentes. Matriz usa mocks, não prova sessões reais/RLS. Local3000HTTP200. Inventário confirmou aba interna ainda em data: página de erro; seleção não repetida nem contornada. MVP de apresentação ainda não aprovado; cadastro/edição/busca visual eperfis reais pendentes.

## Aceite visual restabelecido — 05/10/2026
MVP funcional para apresentação local acompanhada de contatos/documentos comprovado na sessão atual. Contato fictício sem telefone criado, encontrado na busca, editado e reaberto após recarga com persistência. PDF vinculado ao fixture arquivado/baixado; texto confirma cliente preenchido sem variável pendente. Uma fixture claramente marcada NÃO UTILIZAR foi preservada (total passa4065→4066; importados continuam4050). Nenhum cliente real alterado ou mensagem enviada. Evidências visuais/PDF foraGit emlimpax-private/Downloads.
Encontrado/corrigido no editor: campo cliente preenche destinatário vazio sem substituir texto manual; erro de Zod ao arquivar mostra mensagem clara.17testes/4arquivos passaram; após nova regressão,9testes/2arquivos passaram; lint/typecheck integral/diffcheck/conferência36fragmentos passaram. Não somar suítes repetidas. Alterações locais ainda não são as imagens ARM publicadas59713f3fb.
Bloco1não totalmente fechado: quatro perfis em sessões reais ainda não exercitados; testes unitários cobrem16combinações; prévia direta porblob novamente não capturada, enquanto download do arquivo persistido passou; qualidade OCR do acervo real pendente. Bloqueio anterior do navegador resolvido pelo titular. G13aberto; sem produção/VPS/HTTPS/WhatsApp. Próximo: bancada isolada porperfil e recuperação de aplicação; roadmapassinaturas eletrônicas/IA/domínio.


## Fechamento do bloco 1 — 05/10/2026
**Bloco 1 concluído para apresentação local acompanhada de contatos e documentos. MVP funcional para apresentar ao cliente. Produção/G13 não liberados.**
Prévia direta: implementado download nativo por formulário POST na mesma rota autenticada, mantendo Origin, papel agent, papel admin para PNG, schema estrito e limite real de 1 MB. O navegador interno baixou documento-previa.pdf; conteúdo e renderização visual conferidos. Link antigo por blob não concluía no navegador interno. Prévia pronta fica disponível somente enquanto o conteúdo corresponde ao documento atual; recursos temporários são liberados.
Acervo real: inventariados 326 PDFs sem alterar originais. Proposta com duas páginas de origem gerou três páginas no editor; comparação do texto normalizado com extração independente foi idêntica, sem avaliar reprodução do layout original. Termo escaneado gerou duas páginas de texto, reconheceu seis trechos impressos de referência e mostrou baixa confiança na página de origem. Manuscritos e dados críticos exigem revisão humana. Nenhum conteúdo real foi salvo como modelo ou emitido; extrações privadas permanecem foraGit. É leitura assistida e reconstrução em modelo editável, não cópia fiel de tabelas ou assinaturas do original.
Perfis: quatro usuários sintéticos em duas organizações técnicas separadas no Supabase atual, não num novo banco. Auth real e RLS: cada papel viu exatamente o contato do seu tenant e zero do outro. Chrome externo com sessão separada preservou a sessão do titular no navegador interno. Leitor: leitura de contatos, POST de cadastro negado403, documentos redirecionam ao inbox. Atendente: documentos sem PNG/arquivo, PDF baixado. Gestor: documentos sem PNG/arquivo. Admin: modelos/PNG/arquivo disponíveis. As16combinações unitárias continuam complementares; não alegar teste visual de todas as operações possíveis. O botão de cadastro ainda é oferecido ao leitor, mas o servidor nega a gravação; melhoria de orientação visual não impede a demonstração administrativa. Ao final, quatro memberships revogadas e quatro usuários bloqueados, senhas removidas do recibo; nenhuma permissão de usuário Limpax alterada, nenhuma mensagem enviada.
Verificação final:23testes em5arquivos passaram, typecheck integral e lint direcionado passaram. Não somar novamente testes repetidos às contagens anteriores. Alterações locais ainda não estão nas imagens ARM publicadas59713f3fb.
Próximo bloco executável: recuperação da aplicação com login e documento em cópia isolada; atualizar backup de Storage para incluir PDFs técnicos emitidos após o snapshot anterior. Bloqueios externos:VPS gratuita,HTTPS eWhatsApp hospedado. Históricos com identidade ambígua dependem de vínculo comercial inequívoco. Roadmap:DocuSign, retorno manual Gov.br,IA configurada ecrm.limpaxdf.com.br.

## Tarefa ativa — limpeza pessoal e bloco 2, 05/10/2026
Titular autorizou remover conexão e mensagens pessoais de teste e depois executar o bloco 2. Limpeza transacional concluída:27mensagens,3conversas,1canal pessoal,101webhooks e56eventos associados removidos;1tentativa vazia arquivada. Contatos antes/depois4066,importados4050;zero mensagens/conversas/canais ativos na organização. Auditoria gravada sem conteúdo pessoal. Recibo e escopo privados foraGit. Backups históricos anteriores podem conter esse teste: não reutilizá-los como snapshot de instalação limpo.
Bloco2ativo:backup limpo do banco e Storage, restauração em cópia isolada,loginAuth ePDF na aplicação restaurada,atualizar imagens de distribuição. Storage limpo:6objetos privados e4PDFs com hash conferido. Next3000mantido. Dockeriniciado somente para recuperação; serviços automaticamente iniciados de outro projeto não foram alterados. Nenhum WAHA/worker/scheduler Limpax iniciado.


## Fechamento do bloco 2 — 05/10/2026
Limpeza pessoal concluída: conexão, 27 mensagens, três conversas, 101 webhooks e 56 eventos associados removidos em uma transação; tentativa vazia arquivada. Contatos preservados: 4.066 totais, 4.050 importados; zero mensagens, conversas e canais ativos. Backups históricos privados preservados; usar snapshot novo limpo.
Backup limpo restaurado em banco isolado: 222 tabelas, 632 políticas, 479 funções, 24 ACLs padrão; 4.050 contatos, 5.050 linhas e 11 lotes reconciliados sem diferenças. ACL vault e quatro vínculos de roles de serviço recuperados apenas localmente. Auth existente autenticou com senha rotacionada somente na cópia, sem alterar conta operacional. Storage compatível v1.79.31: seis objetos/quatro PDFs recuperados, hashes iguais, anônimo negado. Chrome na imagem ARM publicada: login, total de contatos, quatro arquivos, download de PDF igual ao backup e nenhuma conexão cadastrada. Emulação comprova funcionamento, não desempenho da VPS.
Commit 827d57d42 enviado; CI 37271284402 aprovada e três imagens acessíveis anonimamente. Candidato atual: docs/releases/limpax/827d57d42-arm.json. Relatório: docs/LIMPAX_BLOCO_2_RECUPERACAO.md. Evidência agregada sem PII: docs/evidence/limpax-block2-recovery-20261005.json. Next 3000 HTTP200 preservado; seis containers temporários de recuperação encerrados, nenhum WAHA/worker/scheduler Limpax iniciado. Senha descartável retirada do recibo.
Blocos 1 e 2 concluídos; MVP funcional para apresentação local acompanhada. Produção/G13 abertos. Próximo: bloco 3, hospedagem disponível com candidato fixado, HTTPS/Auth/permissões/desempenho e WhatsApp empresarial autorizado. Oracle gratuita depende de capacidade, sem nova tentativa nesta etapa nem autorização de cobrança. Identidades/históricos ambíguos continuam sem mesclagem; DocuSign, retorno manual Gov.br, IA e domínio são roadmap.
## Bloco 3 iniciado — 05/10/2026
Blocos 1 e 2 concluídos; MVP funcional para apresentação local acompanhada. Roteiro Oracle atualizado para revisão827d57d42 e manifesto imutável; CI37271284402 aprovada. Guardas de instalação/publicação:37 testes Vitest aprovados. Metadados oficiais confirmam ARM64 de WAHA, Redis, ponte Redis HTTP e Caddy, sem baixar camadas ou iniciar serviços. Tentativa inicial com runner Node inadequado falhou antes dos testes; execução correta Vitest passou. CRM local3000 mantido.
Sessão Oracle expirou; aba Chrome entregue ao titular para login. Capacidade ainda não reconsultada nesta etapa. Nenhuma VPS criada, SSH liberado, instalação aplicada ou HTTPS público validado. Custo zero obrigatório. Próximo: autenticar no console, conferir cota/rede/capacidade, instalar manifesto fixado, validar HTTPS/login/perfis/PDFs/desempenho e parear WhatsApp empresarial autorizado. G13 aberto. Roadmap: DocuSign, retorno manual Gov.br, IA e domínio crm.limpaxdf.com.br.
## Observações na transição — 05/10/2026
Titular pediu observações da planilha no histórico de cada cliente. Auditoria READ ONLY da base operacional: 5050 linhas;1950 observações CADASTRO preservadas sem diferenças;1856 vinculadas a contatos;94 em linhas sem identidade vinculada. Nenhuma reimportação, mesclagem ou gravação remota. Recibo privado observations-audit-20261005.json, sem conteúdo de clientes em Git.
Ficha agora chama Timeline de Histórico e reutiliza WorkbookContactHistory junto das atividades do CRM. Preserva observação literal, data original, endereço, valor, aba/linha e vínculo de origem; não cria atividade retrodatada nem inventa atendimento/pagamento. Aba específica Histórico da planilha permanece. Nove testes de leitura/guarda/display aprovados; lint direcionado e diffcheck passaram. Servidor local3000 mantido; sessão Chrome retornou login, conferência visual autenticada nova pendente.94 observações sem cliente exigem identificação antes de associação. Publicação de nova imagem necessária para levar este ajuste ao futuro deploy; manifesto anterior continua evidência da versão anterior. Bloco3/Oracle/HTTPS/WhatsApp eG13 abertos.
