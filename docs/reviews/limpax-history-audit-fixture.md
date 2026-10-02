# Correção autorizada da fixture de auditoria

Bancada GitHub36967438149/commit69c17c56a:18 casos executados,17 aprovados e1 falhou na contagem de api_audit_log. O perfil manager do próprio teste não tem SELECT autorizado por audit_log_select (admin), portanto conta zero mesmo que exista auditoria. Não mudar RLS do produto para fazer esse teste passar.

Proposta revisável em limpax-history-audit-fixture.patch: somente observações do log usam o dono do PostgreSQL descartável; comandos de importação continuam com JWT/role de manager. Todas as18 asserções/casos permanecem; preservar resultado esperado1 no replay e0 no rollback. Não executar no banco operacional.

Aplicado em 02/10/2026 após autorização explícita: “Sim, corrigir o teste e repetir a bancada”. Commit 34bff39ed enviado ao fork público. Exceção DESKCOMM_GOV_INVARIANTS_EDIT usada somente durante este commit autorizado, sem mudar a regra freeze-invariants.sh. Nenhuma policy, grant, asserção ou regra do produto foi alterada. Matriz PostgreSQL15/17 na execução36971628633; resultado deve ser conferido na evidência mais recente.
