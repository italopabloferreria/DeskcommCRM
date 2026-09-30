# I Can't Believe CRM

CRM self-hosted da **!AI (I Can't Believe It's AI)** para atendimento, vendas e automação com agentes de IA.

![I Can't Believe CRM](docs/brand/ai-logo-dark.svg)

## O que é

I Can't Believe CRM é o CRM da !AI, preparado como produto próprio. Ele preserva a base funcional open source: CRM multi-tenant, WhatsApp como canal primário, agentes de IA, Supabase, LGPD, auditoria e instalação self-hosted.

## Tecnologias

- Next.js 16, React 19 e TypeScript
- Supabase Postgres, Auth, Storage e Realtime
- Tailwind CSS 4 e design system white-label
- WAHA para WhatsApp
- Vercel AI SDK e provedores de IA configuráveis
- Docker para instalação self-hosted

## Instalação local

```bash
git clone https://github.com/italopabloferreria/icantbelievecrm.git
cd icantbelievecrm
pnpm install
pnpm dev
```

## Docker

Use os arquivos `docker-compose*.yml` como base para ambientes locais e produção. Antes de publicar imagens, atualize os nomes no GitHub Container Registry para o repositório `italopabloferreria/icantbelievecrm`.

## Arquitetura

- `app/`: interface, rotas públicas, área autenticada e APIs Next.js
- `components/`: componentes compartilhados
- `lib/`: domínio, autenticação, branding, integrações e agentes
- `workers/`: workers e rotinas de fila
- `supabase/`: schema, migrations e baseline
- `docs/`: documentação técnica e operacional

## Roadmap

- Finalizar identidade visual oficial da !AI
- Publicar imagens Docker próprias
- Renomear o repositório para `icantbelievecrm`
- Revisar documentação operacional de VPS para a marca !AI
- Adicionar funcionalidades específicas da !AI/Limpax sem quebrar a compatibilidade da base

## Screenshots

Screenshots finais serão adicionados após validação visual do produto com a marca !AI.

## Contribuição

Use branches pequenas, preserve regras de negócio existentes e rode validações de lint, tipos, testes e build antes de enviar mudanças.

## Based on the amazing work from DeskcommCRM.

Este projeto é baseado no trabalho original de [DeskcommCRM](https://github.com/melgarafael/DeskcommCRM), distribuído sob licença MIT. O aviso de copyright e a licença original foram preservados em `LICENSE`.

## Licença

MIT.
