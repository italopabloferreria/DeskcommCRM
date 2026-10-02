# Ciclo do histórico LimpaxCRM

Estado: rascunho técnico, não instalado no Supabase operacional. Não é parecer jurídico nem define prazo legal de retenção.

## Origem, correção e replay
A origem importada é imutável para papéis da API. Outra decisão para o mesmo arquivo gera conflito; não sobrescrever o atendimento nem importar um arquivo renomeado como correção. A futura correção deve ser comando explícito, manager/admin, com motivo estruturado, versão esperada e recibo idempotente; alteração de cliente/local exige pertencimento verificado. Correção não é merge de clientes. Revisões e interface de correção ainda não implementadas; confirmação segue bloqueada.

## Anonimização vinculada a contato
A migração0449 já redige people/import_rows por contacts.person_id. O rascunho limpax_history_lifecycle.sql estende o mesmo evento false→true às cópias em limpax_service_history e aos locais da pessoa. Limpa bruto, referência original, nota, data, valor, moeda e endereço; preserva IDs/origem/hash/recibo e marca redacted_at. Não é anonimização matemática: IDs e hashes residuais são rastreabilidade restrita e requerem política de retenção e avaliação de reidentificação.

A transação existente decide autorização e audita o exercício do direito. Funções novas são internas e revogadas de todos os papéis PostgREST. O rascunho não oferece endpoint próprio para anonimização. Replay devolve recibo sem restaurar bruto. Nova inserção de serviço/local de pessoa com contato já anonimizado é recusada; lock de people serializa com a cascata existente. Falha reverte a transação.

## Limites que impedem habilitar escrita
- Pessoa sem contato: o fluxo atual de direito do titular não a alcança. Precisa de portão próprio integrado, não inferência por nome.
- Histórico vinculado somente à empresa e linhas auxiliares podem conter pessoas no bruto. Exigem revisão da titularidade; não apagar a empresa ou outros titulares automaticamente.
- Nome de arquivo, arquivos de origem, exportações, staging privado, backups e documentos são outras cópias. O gatilho não redige esses locais.
- Export do titular ainda não inclui locais/serviços históricos: integrar antes de liberar módulo.
- Não foi definido prazo automático de retenção do histórico. Não copiar o prazo da auditoria para contratos/atendimentos.
- Histórico append-only precisa de expurgo administrativo específico; não conceder DELETE/TRUNCATE às roles da API para resolver retenção.
- Correções devem participar de export/redação/expurgo. Nenhuma tabela de revisão foi criada nesta etapa.

## Prova
Bancada usa somente banco PostgreSQL efêmero e dados sintéticos. Testes lifecycle verificam cópias/origem, replay, bloqueio nova origem, escopo organizacional/empresa, rollback e revogação. Não equivalem a carga real, restore operacional, export completo ou G13 aprovado.
