# Bloco contínuo de ciclo histórico — 02/10/2026

Autorização do proprietário: “faça todo o bloco non stop”. Branch vertical/limpax existente, árvore suja preservada. Sem delegação, banco real, carga real, DNS, recursos pagos ou serviços locais pesados.

- [x] Schemas estritos e preparação dos comandos/erros.
- [x] Comandos SQL opcionais em rascunho: correção versionada, exclusão lógica e anonimização de pessoa sem contato.
- [x] Proteção contra restauração, replay/conflito, suporte/MFA/RBAC e audit sem conteúdo.
- [x] API e interface em detalhe de pessoas/empresas; módulo ausente mostra indisponível sem escrita.
- [x] Export da pessoa sem contato (cadastro, vínculos, linhas e histórico), com limites e falha fechada.
- [x] Testes de unidade/componente/API e PostgreSQL15/17 no GitHub.
- [x] Evidências, arquivos de retomada, commit e push.

Limite: exclusão lógica cancela o registro corrente, preservando a origem; anonimização é a limpeza irreversível de conteúdo pessoal. Não definir retenção legal automática nem apagar arquivos/backups por inferência. Instalação canônica fica separada da prova em rascunho até gates de recuperação/alocação.

Prova de código:e531c7133 enviada. ProvaPG43/43 por15/17 e263 contratos por job no run36987396496.
Governança completa aprovada: typecheck, ESLint, canais, papéis e 17.168 testes unitários aprovados de 17.171, além de1 falha esperada e2 pulados preexistentes.
Primeira suíte geral encontrou23 falhas; corrigidas sem reduzir gates. Documentos continua no hub CRM/busca.

Checklist de integração no contrato docs/specs/limpax-history-lifecycle.md, mapa vivo
atualizado e novo fragmento de release validado pela função pura parseFragmento.
Tipo focado12 arquivos e lint novos sem avisos; advertências herdadas das duas fichas
não foram escondidas. Teste de componente não substitui aceite visual hospedado.

Cobertura de titularidade/cópias conferida: docs/specs/limpax-history-privacy-coverage.md. Não constitui política legal ou limpeza de arquivos.
