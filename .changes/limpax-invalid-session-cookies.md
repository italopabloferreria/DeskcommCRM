---
impacto: nada_mudou
secao: corrigido
titulo: Sessão inválida é descartada ao voltar ao login
---

Redirecionamentos ao login e respostas401 preservam a limpeza dos cookies emitida pelo Supabase, evitando reutilização de sessão inválida ou de usuário bloqueado. Não altera bloqueios, senhas ou permissões.