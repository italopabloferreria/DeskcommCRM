# Índice de conhecimento — ICB CRM

Use este arquivo para escolher a fonte mínima necessária.

## Estado atual do produto

- `/ARCHITECTURE.md` — visão de uma página da arquitetura e integrações.
- `/AGENTS.md` — contrato portável para agentes e mapa das skills embutidas.
- `/CLAUDE.md` — doutrina completa e Definition of Done; obrigatório antes de alterar código.
- `/docs/index.md` — mapa da documentação.
- `/docs/current-state.md` — o que está realmente implementado vs. incompleto.
- `/.env.example` — inventário documentado de variáveis e integrações; nunca copie segredo real.

## Operação e implantação

- `/.agents/skills/deskcomm-instalar/SKILL.md` — VPS, domínio, Supabase, WhatsApp, atualização,
  backup, recuperação e troubleshooting de instalação.
- `/.agents/skills/deskcomm-cliente-novo/SKILL.md` — implantação de um cliente/nicho pela UI:
  credenciais, provedores, funil, conhecimento, follow-ups, agentes, roteadores, memória e skills.
- `/hostgator-setup-kit/` — fonte real dos scripts de instalação/operação.

## Desenvolvimento

- `/.agents/skills/deskcomm-doutrina/SKILL.md` — ponteiro para regras de código.
- `/app/` — UI e Route Handlers.
- `/lib/` — auth, API, IA, canais, branding, Supabase e integrações.
- `/workers/` — filas e workers.
- `/supabase/` — schema, baseline e migrations.

## Tutorial do criador

- `references/video-tutorial.md` — índice operacional com timestamps.
- O vídeo é referência explicativa; não substitui código/docs atuais.

## Diferenças do fork

- `references/fork-notes.md` — somente divergências deliberadas do upstream.

## Regra rápida

Pergunta de uso/configuração -> tutorial + skill operacional específica.
Pergunta sobre comportamento atual -> código/docs atuais.
Pergunta sobre mudança de código -> CLAUDE.md + deskcomm-doutrina.
Conflito entre fontes -> código atual vence e a divergência é registrada.
