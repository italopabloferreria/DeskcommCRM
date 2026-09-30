# LimpaxCRM — vertical sobre DeskcommCRM

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

Estado em 30/09/2026: dependências locais instaladas com pnpm 9.15.9; 64 testes de callback, convite e CRM B2B passaram em 8 arquivos. O Windows não tem Docker nem WSL. O proprietário autorizou o projeto Supabase isolado bzretxzwnudtpxmoqjyv; nele foram instaladas as extensões vector/citext/pg_trgm e o baseline Deskcomm. Verificação posterior: 186 tabelas públicas, todas com RLS. Ítalo criou a única conta Auth confirmada, vinculada à organização Limpax como admin ativo e à instalação como administrador de plataforma. O proprietário confirmou a rotação da senha do banco antes exposta no chat. O cadastro direto foi desligado no Supabase e persistiu após recarga. O projeto Supabase antigo permanece intacto. A instalação local abre `/login` com a logo original Limpax, cores da marca e nome LimpaxCRM; o crédito da iCBAI aparece na fachada. `SIGNUP_MODE=so_convite` oculta a chamada de cadastro livre na tela de login, e `/signup` sem convite mostra a recusa. O Supabase Auth registra login real de Ítalo por e-mail às 06:41:50 de 30/09/2026 (America/Sao_Paulo); ele relatou testes sem erros. Painel/saída, Google, convites, empresas e demais papéis ainda aguardam validação; o provedor Google está desativado. Não houve publicação do fork.

O destino desta mudança é a **vertical Limpax** para nome, logo e crédito iCBAI; a superfície de contraste configurável é genérica e reutilizável por instalações que usam logo claro. Entrada: `/login`; saída: `/signup` direto mostra a recusa, e o convite válido conserva seu fluxo existente. O feedback de erro permanece na tela de cadastro e nos logs da política; se a leitura do banco falhar, `SIGNUP_MODE` sustenta o piso da instalação. O mapa vivo não ganha módulo nem rota nova: a fachada já existia e continua vinculada a `marcaDaSaida`, `modoDeCadastro` e `platform_branding`. Evidência: navegador mostrou título `Entrar · LimpaxCRM`, logo, amarelo, crédito iCBAI e ausência de link aberto; 21 testes focados passaram.

## Verificação B2B da instalação isolada — 30/09/2026

`MODULO_CRM_B2B` foi ativado no projeto `bzretxzwnudtpxmoqjyv`. Antes do teste havia zero empresas, pessoas e vínculos. Treze verificações com duas contas e uma organização fictícias passaram: criação de empresa, pessoa e vínculo por manager; leitura no tenant; negação de leitura/criação entre tenants e para anônimo; leitura por viewer do tenant e negação de criação por viewer. Essas contas, organização e registros do teste de políticas foram removidos; o postflight confirmou apenas a conta Auth de Ítalo e zero linhas B2B.

No navegador local, outra conta fictícia manager entrou em `/app`, criou empresa e pessoa, e saiu. O teste revelou que a ficha de empresa apenas mostrava vínculos; foi adicionado o controle **Vincular pessoa**, que usa a API já existente, oferece pessoa cadastrada e cargo opcional, mostra erros e atualiza a ficha. O vínculo apareceu após recarregar a página. Após sair, `/app/companies` redirecionou para `/login?next=%2Fapp%2Fcompanies`. TypeScript, lint dirigido e `git diff --check` passaram. A conta temporária foi removida; ficaram **uma empresa, uma pessoa e um vínculo com prefixo `[TESTE]`** para demonstração pelo proprietário, sem PII real. O servidor local pode ser reiniciado com `npm run dev`; não houve push ou deploy. Google OAuth, entrega de e-mail, convites reais e papéis adicionais no navegador continuam pendentes.
