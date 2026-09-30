# LIMPAX OS — vertical sobre DeskcommCRM

Esta branch local `vertical/limpax` integra a vertical Limpax sem transformar o Deskcomm core em produto específico de uma empresa. O fork `origin` é `italopabloferreria/DeskcommCRM`; `upstream` é `melgarafael/DeskcommCRM`. A branch foi aberta a partir do mesmo commit `50d14bd` em ambos, em 30/09/2026. Ainda não houve push nem deploy.

## Primeira decisão de interface e acesso

Usar a tela e o frontend padrão do Deskcomm, incluindo `/login`, Google e o fluxo existente de convite. Não portar a tela de login nem o shell do CRM antigo da Limpax. A instalação Limpax deverá ser configurada em `so_convite` e testada com contas reais autorizadas antes de ser exposta. Decisão do proprietário: Ítalo e demais administradores da organização podem convidar; manager, agent e viewer não podem. O Deskcomm já exige admin na página e no POST de convite, no reenvio/revogação e na RLS de team_invites. Isso foi conferido no código; a matriz com identidades reais ainda depende da instalação.

## Modelo e separação

`organizations` representa o tenant. O CRM B2B opcional já tem `companies`, `people` e `company_people` para empresas clientes com múltiplas pessoas. Avaliar o comportamento real antes de adicionar tabelas. A vertical exige múltiplos locais de atendimento por cliente, separados de contatos e do endereço cadastral da empresa. Esse encaixe ainda não foi implementado.

- **A, Limpax somente:** marca, serviços e regras próprias. Fica nesta vertical por configuração ou módulo específico.
- **B, reutilizável:** locais de atendimento, OS, campo, frota, contratos. Seguir a arquitetura de módulo opcional com dados, RLS, migration, baseline e manifesto; o pacote de extensão declarativa atual aceita cartões de orientação, não tabelas ou rotas.
- **C, core genérico:** correções e melhorias úteis ao Deskcomm. Isolar em `feat/*` baseada no upstream para futura contribuição.

A entrada de leads do site Limpax deve usar uma integração autenticada e idempotente, sem banco compartilhado. O CRM antigo permanece preservado como site, captação, regras e histórico. Não reutilizar automaticamente seu Supabase, credenciais, usuários ou dados.

## Sequência verificável

1. Preparar instalação local separada conforme `CLAUDE.md` e `docs/deploy-selfhost/README.md`.
2. Verificar login padrão, Google, `so_convite`, recusa de não convidados, saída e convite por admin da organização; corrigir lacunas no menor escopo.
3. Ativar CRM B2B em ambiente de teste e validar empresa, pessoas, contatos e lead.
4. Desenhar e implementar múltiplos locais como módulo reutilizável, com autorização por organização.
5. Só então integrar leads do site e evoluir OS/campo/financeiro, com migração reversível se houver dados antigos a aproveitar.

Estado em 30/09/2026: dependências locais instaladas com pnpm 9.15.9; 64 testes de callback, convite e CRM B2B passaram em 8 arquivos. O Windows não tem Docker nem WSL; sem .env.local e sem banco isolado conectado, não há instalação funcional nem teste E2E. Na organização Supabase Limpax há dois projetos no plano grátis. O projeto bzretxzwnudtpxmoqjyv está separado do CRM antigo. Preflight SQL somente de leitura: 0 tabelas públicas, 0 usuários, 0 buckets, migration_table NULL; 0 extensões vector/citext/pg_trgm instaladas. O painel indica Unhealthy, embora as consultas SQL funcionem. É apenas candidato a ambiente LIMPAX OS, sem alteração remota nesta etapa. Um .env.local ignorado pelo Git foi criado só com SIGNUP_MODE=so_convite e NEXT_PUBLIC_APP_URL=http://localhost:3000; não há chaves. Nenhuma migração, ativação de módulo ou publicação foi concluída.
