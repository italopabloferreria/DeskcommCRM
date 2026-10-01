## Implementação ARM — 01/10/2026

Workflow limpax-arm-images.yml e verificador implementados no fork: build nativo GitHub de app/worker/scheduler, imagens locais arm64 e cinco sondas reais reutilizadas de publish-image.yml. Execução por push relevante da vertical ou manual, exclusiva do fork, sem publicação/segredos reais/deploy. Testes:8/8 de recusas/permissões e198/198 do mapa; ESLint, sintaxe Node, TypeScript focado e fragmento de release aprovados. Build ARM remoto ainda NÃO executado. Guarda do instalador para novas instalações ARM ainda existe e deve ser resolvida com caminho explícito/testado, sem removê-la cegamente. Próximo: executar workflow, publicar conjunto compatível somente após provas, configurar VPS. Backup aguarda caminho do arquivo da senha atual solicitado ao proprietário; nenhuma0495/dados reais ou recurso Oracle criados. Local pesado continua desligado. Comparação de planos: captura do proprietário mostra2/4/8GB; Oracle A1 pode oferecer2OCPU/12GB dentro dos limites atuais, com capacidade/recolhimento por ociosidade previstos na documentação. G13 aberto.
## Avanço Oracle — 01/10/2026

Confirmado que não há outro agente operando banco/Oracle. Região home São Paulo verificada. Assistente preparado até revisão: limpaxcrm, A1.Flex2OCPU/12GB, Ubuntu24.04 Minimal aarch64, disco80GB/VPU10 com criptografia em trânsito. Rede/sub-rede novas propostas; revisão ainda mostra IPv4 público NÃO e chave SSH ausente. NÃO criar assim: falta completar acesso e confirmar configuração concreta. Nenhum recurso criado. Pipeline atual gera apenasamd64; imagens ARM próprias são gate de instalação. Runbook do fork: docs/runbooks/limpax-oracle-rollout.md. Backup: sem URL administrativa nos .env nem pg_dump/psql no PATH; pedido apenas caminho do arquivo local da senha atual, nunca a senha no chat.0495 não aplicada; sem deploy ou serviços locais iniciados.
# Retomada vigente — LimpaxCRM — 01/10/2026

Esta seção prevalece sobre o histórico abaixo. Não recriar o projeto.

## Projeto e decisões

Implementar exclusivamente em `C:\Users\italo\Programação\01_PROJETOS\DeskcommCRM`, origin `italopabloferreria/DeskcommCRM`, branch `vertical/limpax`. HEAD conferido: `ab1ea517c`, enviado ao GitHub, árvore limpa antes desta atualização documental. Este repositório Limpax conserva site público e histórico; o clone alternativo LIMPAX não é o fork.

Marca **LimpaxCRM**, logo/cores Limpax e crédito **iCBAI**. Login/frontend padrão Deskcomm adaptado à marca. Ítalo e administradores podem convidar; demais papéis não. Login por e-mail validado; Google desativado no Supabase novo; entrega de convites e matriz real adicional pendentes.

Supabase novo exclusivo `bzretxzwnudtpxmoqjyv`: baseline instalado; 186 tabelas públicas com RLS na verificação anterior. Não tocar `lkamarbpjqlibxlmcico`, D1/R2 nem site antigo. Há dados sintéticos DEMO; nenhuma planilha real importada.

## Entrega e limites comprovados

CSV/XLSX com análise sem gravação, oito campos mapeáveis, amostra e confirmação; três exports CSV separados de empresas/pessoas/contatos. Endereços não mapeados; contato depende de telefone válido; não cria oportunidade automaticamente. CSV não é backup.

0495 preparada e **NÃO aplicada**: RPC única, trava por organização, fingerprint/replay, rollback de linha e lote. App recusa503 sem RPC; sem fallback parcial. 26 testes leves, lint/TypeScript focados e 13 provas SQL offline passaram. Baseline completo/concorrência real de duas conexões NÃO testados; TypeScript global excedeu teto de memória. Runbook: `docs/runbooks/limpax-import-rollout.md` no fork.

Autorização recebida: proprietário respondeu “pronto” à pergunta específica sobre backup/preflight, prova sintética de0495 em ROLLBACK e aplicação somente após checks aprovados. Não repetir a pergunta. Não abrange carga real, convites, DNS nem recursos pagos.

Oracle: conta criada segundo proprietário; console/região/capacidade/VPS ainda não verificados. Fork NÃO publicado; Vercel antiga não hospeda esta instalação. Usar imagem própria da branch: compose padrão aponta upstream. G13 permanece aberto.

## Verificação de hospedagem nesta retomada — 01/10/2026

Painel Supabase confirmado: projeto Limpax Healthy, plano FREE; página Backups informa que o plano gratuito não inclui backups. Backup privado/restauração segue gate antes de0495; nenhuma migração aplicada. Console Oracle autenticado, região ativa Brazil East (Sao Paulo), conta Free Tier em avaliação. Assistente de criação aberto somente para inspeção; nenhuma VM/rede/chave/recurso criado. Região principal e capacidade Always Free ainda não confirmadas. Serviços locais não iniciados.
## Próximo trabalho e restrições

1. Ler regras do fork, handoff, código/testes e runbook; conferir Git antes de mudar.
2. Conferir backup privado e restauração, preflight e prova BEGIN/ROLLBACK antes de aplicar somente0495. Se falhar, não persistir. Senha do banco foi rotacionada; agente não conhece a atual. Nunca pedir no chat nem mostrar segredos. Não executar db push indiscriminado.
3. Provar concorrência/isolamento reais e comparar contagens sem resíduos. Preparar Oracle dentro dos limites gratuitos atuais verificados; acesso público/rede exige confirmação concreta.
4. Publicar imagem própria verificada, HTTPS e aceite de importação/exports com dados fictícios. Backup/recuperação, estrutura da planilha e separação DEMO antecedem uso real.

**Manter Next/Docker/builds pesados locais desligados** por pedido do proprietário devido à RAM. Volumes preservados. WAHA foi conectado antes, atualmente parado; envio/recebimento não validado. OpenRouter aceito pelo editor, sem credencial/teste real; nenhum agente ativado.

Um operador por vez para banco/deploy. Outros agentes podem revisar escopo delimitado em branch isolada; não aplicar migrações concorrentes nem presumir delegação autorizada. Atualizar estes três arquivos e handoff do fork ao terminar. `docs/current-state.md` do fork é retrato histórico upstream, não estado da vertical.

Preservar alterações alheias: package.json e arquivos antigos de acesso/Storage Supabase encontrados no git status. Não incluí-los automaticamente no commit da vertical.

Prompt de nova conversa: `docs/START_NEW_CONVERSATION.md`. Handoff do fork: `docs/HANDOFF-LIMPAX.md`.

---
