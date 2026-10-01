## Preparação de instalação e acesso pendente — 01/10/2026

Oracle abriu Cloud Sign In no navegador do Codex; proprietário solicitado a entrar novamente. Chrome indisponível. Ainda sem VM/SSH/IPv4 público confirmado. Não foram geradas chaves nem criados recursos. Senha atual do Supabase continua desconhecida; solicitado apenas o caminho do arquivo autorizado, nunca conteúdo no chat. OpenSSH instalado; pg_dump/psql ausentes do PATH. Local pesado continua OFF.

Runbook Oracle agora explica extrair o manifesto do commit documental a57f1f87b para pasta fora do checkout antes de fixar HEAD no commit das imagens0fd1ebba1. Isso preserva a guarda exata de revisão do runtime e evita perder o manifesto ao fazer checkout. São instruções preparadas, não instalação executada. Próximo: login Oracle, revisar acesso/rede concretos, backup privado antes de0495 e domínio HTTPS autorizado. G13 aberto.
## Publicação ARM concluída — 01/10/2026

Estado vigente; as seções seguintes são histórico. Commit das imagens: 0fd1ebba1e9b0880b5d8cfcab501e1a6e3cd5a0d. Execução https://github.com/italopabloferreria/DeskcommCRM/actions/runs/36824890913 concluída SUCCESS: 243 testes Linux, ESLint, fragmento de release, plano com Compose real e suite shell aprovados; app/worker/scheduler construídos em ARM nativo, arquitetura conferida, cinco sondas canônicas aprovadas e exatamente essas imagens publicadas no GHCR.

Manifesto real versionado em docs/releases/limpax/0fd1ebba1-arm.json, copiado do summary público da execução e validado com --check-manifest. Consulta anônima ao registro das três referências por digest e seus blobs de configuração confirmou disponibilidade de metadados, linux/arm64, origem do fork e revisão exata. Não foram baixadas camadas nem iniciados containers locais. Não foi necessário alterar visibilidade dos pacotes.

Destino=infraestrutura da vertical; workflow=.github/workflows/limpax-arm-release.yml; registro=logs/summary/manifesto; consumidor=scripts/limpax-arm-runtime.mjs; porta=docs/runbooks/limpax-oracle-rollout.md; mapa=docs/architecture/limpax-arm.architecture.json. Credencial efêmera packages:write somente no publicador exclusivo do fork/branch. Publicação não altera stable/latest upstream; falha interrompe e exige nova prova.

Próximo passo executável: completar acesso SSH/IPv4 da configuração Oracle e revisar configuração concreta antes da criação. Backup privado/restauração aguarda caminho autorizado do arquivo da senha atual (nunca enviar senha no chat). Migração0495 NÃO aplicada; nenhum dado real importado. VPS, HTTPS/endereço autorizado, pull/apply real e aceite hospedado de login/importação/exports/WhatsApp continuam pendentes. Sondas não comprovam banco real ou fluxos de cliente. Serviços locais pesados OFF; volumes preservados; G13 aberto.

## Entrada de runtime ARM aprovada — 01/10/2026

Código c4bd6a5f99ee9fa5c2b9c2e6756121e5b6194655 enviado ao GitHub. Execução https://github.com/italopabloferreria/DeskcommCRM/actions/runs/36823336516 concluída SUCCESS: testes de recusas/mapa/permissões, ESLint, fragmento, plano usando Compose real com configuração fictícia e suite shell completa no Linux aprovados. A entrada tem23 testes de recusa/sequência/sanitização de JSON. O resultado substitui os status pendentes abaixo.

scripts/limpax-arm-runtime.mjs aceita somente manifesto com digests das três imagens próprias e commit completo, VPS Linux ARM, Supabase bzretxzwnudtpxmoqjyv, .env privado e URLs/segredos/portas coerentes. --plan não baixa/sube/persiste; --apply puxa e confere as sete imagens e origem/commit das três próprias antes de up --no-build/--wait. Nenhum apply real executado; procedência/arquitetura de pull e subida foram simuladas nos testes unitários, o Compose foi real apenas no plano. Não afirmar aceite de runtime/banco/WhatsApp. Proteção omite conteúdo de JSON inválido e erros privados do Docker.

Destino infraestrutura da vertical; instalador/compose upstream intactos, sem SQL/Auth/DNS. Configuração gerada ignorada no Git; projeto Compose fixo limpaxcrm. Publicação de imagens/manifesto continua próximo passo executável; acesso VPS, domínio HTTPS autorizado e backup/restauração privado seguem pendentes.0495 não aplicada e nenhum dado real importado. Local pesado desligado; volumes preservados; G13 aberto.


## ARM aprovado no GitHub — 01/10/2026

Execução https://github.com/italopabloferreria/DeskcommCRM/actions/runs/36820125362 concluída SUCCESS para commit dfa99a5697d5e7abc39c2214adfdfe1a549969b4. App/worker/scheduler construídos em runner nativo ARM, arquitetura conferida e cinco sondas canônicas aprovadas. Essa evidência substitui o status em andamento abaixo. As sondas não validam banco real, WhatsApp, fluxos de usuário ou carga; o worker usa classificador de banco ausente previsto no teste original. Sem publicação de imagem/deploy ou serviço pesado local. Próximo: caminho explícito de instalação ARM/imagens próprias e backup privado antes de0495; instalador ainda recusa ARM novo. G13 aberto.

## Verificação ARM enviada — 01/10/2026

Commit dfa99a5697d5e7abc39c2214adfdfe1a549969b4 enviado a origin/vertical/limpax. Run https://github.com/italopabloferreria/DeskcommCRM/actions/runs/36820125362 em andamento na última consulta: validação inicial passou, app ARM construindo; demais imagens/sondas pendentes. Consultar conclusão antes de afirmar compatibilidade. Não houve publicação/deploy, alteração do banco ou início de serviços locais. Testes locais8/8 e198/198, lint/TypeScript focado/sintaxe/fragmento passaram. WAHA oficial noweb-arm-2026.9.1 linux/arm64 confirmado por metadados do Docker Hub; digests no runbook. Próximo: resolver eventual falha do run, caminho de instalação ARM e publicação própria; backup privado antes de0495 ainda depende de acesso seguro à senha atual. G13 aberto.

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
