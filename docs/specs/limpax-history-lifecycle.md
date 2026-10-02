# Ciclo do histórico LimpaxCRM

Estado: rascunho técnico, não instalado no Supabase operacional. Não é parecer jurídico nem define prazo legal de retenção.

## Origem, correção e replay
A origem importada é imutável para papéis da API. Outra decisão para o mesmo arquivo gera conflito; não sobrescrever o atendimento nem importar um arquivo renomeado como correção. A correção em limpax_history_management.sql é comando explícito manager/admin, com motivo estruturado, versão esperada e recibo idempotente. Pode alterar data, valor, moeda, observação corrente e local compatível; não altera cliente ou origem nem mescla cadastros. API autenticada e painel nas fichas de pessoas/empresas implementados; sem funções instaladas mostram indisponibilidade. Confirmação da importação continua bloqueada.

## Anonimização vinculada a contato
A migração0449 já redige people/import_rows por contacts.person_id. O rascunho limpax_history_lifecycle.sql estende o mesmo evento false→true às cópias em limpax_service_history e aos locais da pessoa. Limpa bruto, referência original, nota, data, valor, moeda e endereço; preserva IDs/origem/hash/recibo e marca redacted_at. Não é anonimização matemática: IDs e hashes residuais são rastreabilidade restrita e requerem política de retenção e avaliação de reidentificação.

A transação existente decide autorização e audita o exercício do direito. Funções novas são internas e revogadas de todos os papéis PostgREST. O rascunho não oferece endpoint próprio para anonimização. Replay devolve recibo sem restaurar bruto. Nova inserção de serviço/local de pessoa com contato já anonimizado é recusada; lock de people serializa com a cascata existente. Falha reverte a transação.

## Limites que impedem habilitar escrita
- Pessoa sem contato: comando administrativo explícito em rascunho limpa people/company_people/import_rows/locais/serviços e cria tombstone. Recusa pessoa com telefone ativo para não apagar vínculo compartilhado por inferência. Guardas impedem restaurar nome, vínculo, bruto importado e telefone ativo. Não é limpeza de todas as cópias externas.
- Histórico vinculado somente à empresa e linhas auxiliares podem conter pessoas no bruto. Exigem revisão da titularidade; não apagar a empresa ou outros titulares automaticamente.
- Nome de arquivo, arquivos de origem, exportações, staging privado, backups e documentos são outras cópias. O gatilho não redige esses locais.
- Export do titular vinculado a contato implementado no coletor existente: locais/serviços por pessoa e organização, paginação até página vazia, limite de10.000 registros por tabela e16MiB agregado, erro sem PII e sem sucesso parcial. Consulta tabelas opcionais somente após detectar lote limpax_history da organização; esta detecção pressupõe o comando atual, que cria lote para todo histórico. Futuros cadastros manuais precisam participar desse contrato. Exportação direta de pessoa por função SQL estável administrativa inclui cadastro, vínculos, linhas importadas, locais e serviços, com limite antes de agregar. Seu escopo declarado é person_profile_and_history, não um relatório geral de todos os módulos. PII indireta em registros apenas empresariais/auxiliares exige revisão.
- Não foi definido prazo automático de retenção do histórico. Não copiar o prazo da auditoria para contratos/atendimentos.
- Histórico append-only precisa de expurgo administrativo específico; não conceder DELETE/TRUNCATE às roles da API para resolver retenção.
- Exportação existente JSON/PDF inclui observação corrente, versão e exclusão lógica; evento por contato também limpa a observação corrigida. Recibos não guardam conteúdo pessoal. Nenhum prazo/expurgo automático foi criado.

## Prova
Bancada usa somente banco PostgreSQL efêmero e dados sintéticos. Testes lifecycle verificam cópias/origem, replay, bloqueio nova origem, escopo organizacional/empresa, rollback e revogação. Não equivalem a carga real, restore operacional, export completo ou G13 aprovado.

## Export do titular — 02/10/2026
lib/lgpd/history-export.ts é chamado por collectExportData após resolver contacts.person_id no servidor. Sem lote histórico da organização, não consulta as tabelas do rascunho; com lote, toda ausência/permissão/erro/registro inválido aborta a coleta. Nunca considerar tabela ausente como seção vazia quando há evidência de histórico. Filtra explicitamente organização e pessoa porque o admin client bypassa RLS; valida escopo retornado, preserva zero/nulo/bruto e marca de redação. Não loga conteúdo nem mensagem do banco. Paginação usa o número real de resultados, tolera cap de página menor, termina somente com página vazia; não é snapshot transacional, mudanças concorrentes de dados requerem prova adicional antes de uso operacional.

O JSON tem seção b2b.historico_limpax; PDF entregue inclui endereços e cada serviço com observações, bruto, referência e estado de redação, sem corte de amostra. O e-mail atual entrega o PDF e o JSON fica no storage; por isso o PDF também precisa mostrar dados pessoais completos. Teste gera PDF e extrai texto.27 testes em6 arquivos aprovados; tipos focados6 arquivos aprovados; lint focado aprovado. Não houve envio real de e-mail, acesso ao banco operacional ou aceite hospedado.

## Comandos e integração do bloco — 02/10/2026

POST /api/v1/customer-history/service/UUID aceita correct (manager) ou void (admin).
POST /api/v1/customer-history/person/UUID aceita redact_person (admin e confirmação true).
GET person/company usa UUID e cursor after; export=person exige admin. Parâmetros
desconhecidos/repetidos, autoridade no body, origem ausente/externa, suporte somente leitura,
versão antiga ou recurso de outro tenant são recusados. JSON limitado a64KiB reais.
Mutação e audit de IDs/contagens/motivo/versão são atômicos. Replay exato devolve o recibo
sem repetir efeito; mesma chave com outra intenção conflita. Nenhum erro mostra conteúdo
interno do banco. Exportação tem Cache-Control private/no-store e falha sem arquivo parcial.

Void é exclusão lógica corrente, mantendo origem; não é apagamento pessoal. Redact_person
limpa conteúdo pessoal e guarda um marcador que impede restauração. Novos vínculos telefônicos
serializam no lock da pessoa para não atravessar a decisão sem contato.
A origem bruta da correção continua acessível somente nas superfícies autorizadas da organização.
Operação atual e recibo preservam IDs/hash, não garantem anonimização matemática.

Living System Checklist: entrada pelas fichas já existentes no catálogo de navegação;
saída pela RPC/estado atualizado/arquivo JSON; audit api_audit_log no mesmo comando;
versão/exclusão/redação visíveis em CustomerHistory; erro/409 fecha o diálogo apenas após
sucesso e pede revisão; ausência de módulo é explícita. Ações humanas com confirmação,
nenhum envio/IA/follow-up automático. Tentativa de rede reutiliza request_id. Mapa
crm-b2b-companies-people.architecture.json liga fichas, API, SQL e retorno.
Destino: extensão Limpax do módulo opcional B2B; sem ativação o CRM comum permanece inteiro.

O teste transversal também encontrou ausência da guarda de suporte na prévia Documentos.
Ela foi acrescentada antes da geração do PDF; novo teste impede geração em support_readonly.
Sem mudança de persistência, assinatura externa, migração ou arquivos operacionais.

Validação de tela em ambiente real/fresco continua pendente: testes de componente não a
substituem. Não há migração canônica nem instalação operacional; release futura depende de
recuperação comprovada, alocação do schema, instalação e aceite. Não declarar G13 aprovado.
