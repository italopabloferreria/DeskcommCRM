# Rascunhos do histórico LimpaxCRM

Este diretório não entra no baseline nem na cadeia de migrações. Não aplicar no Supabase operacional. SQL e eficácia de RLS/atomicidade ainda NÃO foram comprovados em PostgreSQL.

limpax_history_provisioner.sql define provisionador fixo opcional de locais, serviços e recibos; somente sua chamada cria tabelas. O CHECK compartilhado de import_batches passa a admitir limpax_history, sem remover os dois valores conhecidos do baseline atual. Conferir upstream/PRs antes de alocar migração canônica.

limpax_history_atomic.sql define comando com auth.uid(), papel manager/admin aceito e não revogado, trava de suporte, lock transacional, recibo por origem, conflito de decisão e auditoria sem conteúdo pessoal. Cada comando aborta inteiro em erro; auxiliares conservam o bruto e endereço sem serviço não vira atendimento. Repetição sem efeito não gera auditoria. Limites rejeitam excesso sem truncar. O servidor futuro deve calcular o hash do arquivo recebido, preparar e validar o lote; formato de hash ou UUID não é prova de origem/pertencimento.

lib/crm-b2b/historical-command.ts prepara o payload após revisão, sem gravar nem ligar à API. Sete testes novos mais regressão:37 casos aprovados. Testes estáticos não provam PostgreSQL.

Em bancada test:db descartável com Docker autorizado e recursos disponíveis, executar: pnpm test:db tests/invariants/limpax-history-storage-draft.test.ts tests/invariants/limpax-history-atomic-draft.test.ts.

A bancada aplica baseline/reset e destrói seu banco efêmero. O arquivo storage usa transação revertida; o arquivo atomic prepara schema/fixtures somente nesse DB efêmero e reverte os efeitos de cada caso. Duas conexões verificam busy durante transação aberta. Não rodar no banco real; não iniciar Docker local sob restrição de RAM.

Ainda faltam:18 casos PostgreSQL reais, correções resultantes, política de correção/expurgo LGPD, migração/MANIFEST/baseline após alocação, API/editor/recibo e aceite hospedado. Restauração comprovada antes0495 continua gate.
