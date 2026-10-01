# LimpaxCRM — preparação Oracle Always Free

Estado verificado em 01/10/2026. Nenhuma instância, VCN, chave autorizada na VPS, imagem publicada ou deploy realizado nesta etapa. O formulário é somente rascunho e pode perder opções ao fechar/recarregar.

## Configuração preparada no painel

- Região principal confirmada no menu Oracle: Brazil East (Sao Paulo), sa-saopaulo-1.
- Conta Free Tier em avaliação. Não usar recursos pagos nem depender de créditos temporários.
- Nome: limpaxcrm. Forma VM.Standard.A1.Flex, 2 OCPUs e 12 GB RAM, marcada Always Free elegível.
- Ubuntu 24.04 Minimal aarch64, imagem gratuita.
- Rede/sub-rede propostas no formulário: limpaxcrm-vcn / limpaxcrm-public, CIDR10.0.0.0/24. NÃO criadas. Resumo mostra IPv4 público NÃO e chave SSH ausente. Completar acesso antes de submissão; nenhuma chave autorizada em servidor.
- Disco80 GB confirmado no resumo, VPU10, criptografia em trânsito ativada. Limite gratuito combinado de volumes é200 GB; inventariar uso existente antes de aprovar.
- Acesso SSH por chave, nunca senha pública. Confirmar acesso concreto antes de criação; restringir SSH à origem administrativa. Somente80/443 para site, mantendo app/WAHA/Redis internos. Não abrir3030 ou3000 ao público.

A documentação Oracle vigente descreve1500 OCPU-horas e9000 GB-horas/mês (2 OCPUs/12 GB) para A1 e200 GB de volumes na região principal. Capacidade não garantida; instâncias ociosas podem ser recuperadas pela Oracle. Não migrar para plano pago nem trocar para A2 por tentativa automática.
Fonte: https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm

## Gate de arquitetura antes de instalar

CONFIRMADO pelo código: `.github/workflows/publish-image.yml` publica somente `linux/amd64` (bloco build-and-push). A1 exige `linux/arm64`. Não declarar que workflow_dispatch existente resolve ARM.

Próximo incremento: gerar imagens próprias app/worker/scheduler ARM, identificar pelo commit/digest, provar build e boot no runner compatível. Não construir Next no PC do proprietário. Não mudar canal stable upstream nem sobrescrever versão upstream. Compose deve apontar imagens do fork verificadas; WAHA necessita imagem ARM oficial compatível/versionada, a conferir na documentação do fabricante. Módulo de voz não é requisito desta primeira implantação.

## Ordem restante

1. Backup privado Supabase e restauração: não há pg_dump/psql no PATH ou URL administrativa nos .env conferidos. Proprietário precisa fornecer a senha atual por caminho de arquivo local autorizado ou entrada segura, nunca pelo chat. Arquivo/dump ficam fora de Git. Backup público parcial não cobre Auth/Storage/sessões WhatsApp; registrar cobertura e preservar todas as partes necessárias à recuperação.
2. Aplicar0495 somente após preflight/provaROLLBACK aprovados conforme runbook já autorizado. Testar concorrência real e isolamento.
3. Preparar e validar imagens ARM próprias, revisar rede/disco/chave/configuração concreta. Obter confirmação de acesso público antes da ação correspondente; nenhuma autorização genérica substitui revisão concreta.
4. Criar VPS somente dentro da elegibilidade gratuita, registrar IP sem segredos e verificar SSH/arquitetura/recursos.
5. Configurar serviços auxiliares, segredos privados, HTTPS/endereço autorizado e URLs Auth exatas; não reaplicar baseline sobre banco existente.
6. Validar importação/replay/conflitos e três exports com dados fictícios na hospedagem. Backup/restore, separaçãoDEMO e aceite precedem dados reais. G13 segue aberto.

CRM/Docker locais continuam desligados. Sessão WAHA local preservada em volumes, sem presumir que existe na nova VPS; não enviar mensagens automaticamente.
## Validação ARM implementada — 01/10/2026

Destino: infraestrutura da vertical, sem mudar operação comum/upstream. `.github/workflows/limpax-arm-images.yml` constrói app/worker/scheduler no runner nativo ubuntu-24.04-arm, apenas no fork, em push relevante para vertical/limpax ou acionamento manual. Não escreve no registro, não usa segredos reais nem publica o CRM. Os labels identificam o fork/commit. O módulo de voz não faz parte desta primeira implantação.

`verify-limpax-arm-images.mjs` reutiliza as cinco sondas de produção existentes: boot Next, PDF empacotado, carregamento event_log, boot worker (para no banco ausente, conforme classificador original) e crontab/health do scheduler. Recusa executar Docker fora do GitHub ARM; o modo --check é leve/local. Oito testes locais e ESLint dirigido passaram; fragmento de release validado. Build/boot ARM REAL ainda não executado nesta evidência. Não confundir sonda com aceite do banco ou do cliente.

O instalador `_common.sh` também recusa instalação nova em ARM; ainda não foi alterado. Antes de usá-lo, criar caminho explícito e testado para imagens próprias ARM, preservando proteções upstream e atualização. Não remover a guarda cegamente nem forçar fallback de build na VPS.

Living System Checklist (infraestrutura): entrada=branch/Dockerfiles; saída=gate do runbook Oracle; registro=logs/STEP_SUMMARY; tela/porta=GitHub Actions; configuração=workflow versionado/Run workflow; falha=job vermelho e correção na branch antes de liberação; não há atendimento/IA automática neste fluxo. Mapa=docs/architecture/limpax-arm.architecture.json com retorno da operação ao código. Publicação/backup/aceite remoto continuam gates.
Fonte do runner: https://docs.github.com/en/actions/reference/runners/github-hosted-runners
## WAHA ARM confirmado no registro — 01/10/2026

Consulta somente de metadados no Docker Hub oficial confirmou noweb-arm-2026.9.1 ativo para linux/arm64. Digest da tag: sha256:839c142d2620d4d68e3b060b560253fe820544de912ec64415d0ebad5853959c; digest da imagem ARM: sha256:f5b61310a8093bba82e7a287daef326a4caeaa1827ae2aba5196209b4de2ddba. Nenhuma imagem baixada ou serviço iniciado. A existência da imagem não comprova conexão, QR nem envio na VPS; verificar esses fluxos após instalação. O compose aceita WAHA_IMAGE, mas seu default não foi alterado nesta etapa.

Fontes: https://hub.docker.com/v2/repositories/devlikeapro/waha/tags/noweb-arm-2026.9.1 e https://waha.devlike.pro/docs/how-to/engines/
