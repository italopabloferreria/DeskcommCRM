# Retomada da vertical LimpaxCRM

## Estado verificado em 01/10/2026

- CRM ativo: C:\Users\italo\Programação\01_PROJETOS\DeskcommCRM, branch vertical/limpax. O repositório Limpax conserva o site público e o histórico; não expandir o CRM antigo.
- Banco isolado: Supabase bzretxzwnudtpxmoqjyv. A migração 20261001060000_0495_importacao_b2b_atomica.sql está preparada e NÃO aplicada. Nenhuma planilha real importada nesta etapa.
- Publicação ARM aprovada na revisão 68fe7e0de76a7c7213f247a28a213f27c7297697: 271 testes, lint, Compose real, suite shell e cinco sondas. Manifesto docs/releases/limpax/68fe7e0de-arm.json no fork; três imagens publicadas. Isso não comprova os fluxos com banco e WhatsApp reais.
- Rede Oracle exclusiva criada: limpaxcrm-vcn, limpaxcrm-publica, limpaxcrm-igw, rota e portas web 80/443. SSH fechado. Nova tentativa A1 2 OCPUs/12 GB/Ubuntu24.04 ARM/80 GB retornou capacidade insuficiente no AD-1 de São Paulo. Nenhuma VPS, IP ou HTTPS criado.
- Docker, Next e builds pesados locais permanecem OFF; volumes preservados. Recursos pagos proibidos. DNS oficial adiado; futuro endereço crm.limpaxdf.com.br. G13 aberto.

## Ordem de execução e condições

1. Obter somente o caminho autorizado do TXT da senha atual do banco. Pedido já enviado; não pedir a senha no chat, não procurar arquivos privados arbitrariamente e não trocar a senha novamente. Conexão administrativa ausente em .env/.env.local; pg_dump e psql não encontrados no PATH.
2. Executar backup administrativo privado e comprovar restauração em instalação descartável separada. Reaproveitar o kit existente e seguir docs/runbooks/limpax-import-rollout.md do fork. Não aceitar dump apenas de public como recuperação integral; anexos Storage exigem cópia própria. restore.sh interrompe em erro SQL, mas não é atômico.
3. Só após backup/restauração aprovados, executar preflight e teste sintético com ROLLBACK da0495; aplicar a migração somente se as provas passarem, conforme autorização já recebida.
4. Quando houver capacidade gratuita, concluir a VPS com a rede/chave públicas existentes, SSH temporário somente IP atual /32 e fechar após instalação. Rascunho Chrome3/920935687 preservado na última sessão; validar existência da aba antes de reutilizar. Não repetir criação em loop.
5. Seguir docs/runbooks/limpax-oracle-rollout.md do fork: copiar o manifesto para fora do checkout antes de fixar a revisão exata das imagens. Instalar serviços, validar HTTPS e aceitar login, importação/exportação, isolamento e WhatsApp no ambiente hospedado.

## Limites da autorização

Backup, preflight e teste sintético estão autorizados; aplicação0495 condicionada às provas. Não importar dados reais, convidar usuários, enviar mensagens, cobrar recursos ou alterar DNS nesta etapa. Não repetir testes/builds aprovados sem mudança ou falha nova. Não declarar produção enquanto G13 estiver aberto.

## Implementação disponível

Identidade LimpaxCRM/iCBAI, login/frontend padrão da base Deskcomm, módulos B2B/contatos/leads/tarefas/agenda e dados DEMO já instalados. Importação com mapeamento/prévia/confirmação e exports CSV implementados; aceite real e RPC0495 permanecem pendentes. Papéis administrativos controlam convites. OpenRouter e modelos gratuitos dependem da configuração/credencial e do aceite do fluxo de agentes; não ativar envio real nesta tarefa.

## Histórico preservado

As notas antigas não são instruções atuais: [HANDOFF-LIMPAX-before-consolidation-20261001.md](history/HANDOFF-LIMPAX-before-consolidation-20261001.md).
