## ARM aprovado no GitHub — 01/10/2026

Execução https://github.com/italopabloferreria/DeskcommCRM/actions/runs/36820125362 concluída SUCCESS para commit dfa99a5697d5e7abc39c2214adfdfe1a549969b4. App/worker/scheduler construídos em runner nativo ARM, arquitetura conferida e cinco sondas canônicas aprovadas. Essa evidência substitui o status em andamento abaixo. As sondas não validam banco real, WhatsApp, fluxos de usuário ou carga; o worker usa classificador de banco ausente previsto no teste original. Sem publicação de imagem/deploy ou serviço pesado local. Próximo: caminho explícito de instalação ARM/imagens próprias e backup privado antes de0495; instalador ainda recusa ARM novo. G13 aberto.

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

## Entrada específica de runtime ARM — 01/10/2026

Destino: infraestrutura da vertical Limpax. A entrada scripts/limpax-arm-runtime.mjs usa o Compose existente com um overlay gerado e preserva o instalador upstream. Não instala Docker/Node, não reaplica baseline/migrations, não cria usuário nem configura DNS ou Auth. Pré-requisitos: VPS Linux ARM, Node22+ e Docker Compose com --wait; clone no commit da imagem; .env privado completo, domínio/autorização de acesso e banco existente validados. Backup/restore e0495 continuam gates separados antes da importação real.

O manifesto JSON tem somente schema_version=1, revision=SHA completo e images com app/worker/scheduler. Cada referência deve ser ghcr.io/italopabloferreria/limpaxcrm (ou limpaxcrm-worker/limpaxcrm-scheduler) seguida de @sha256: e o digest real publicado. NÃO existe ainda manifesto publicado nesta etapa. Não usar hashes fictícios dos testes nem trocar para upstream. O projeto Compose é sempre limpaxcrm; usar outro nome cria outros volumes. Preservar esse nome nas atualizações e backups.

Na raiz do clone, o agente prepara a configuração e executa:
- node scripts/limpax-arm-runtime.mjs --check-manifest /caminho/manifesto.json: valida estrutura somente, sem rede.
- node scripts/limpax-arm-runtime.mjs --plan /caminho/manifesto.json: resolve o Compose real sem baixar imagem, iniciar serviço ou persistir overlay. Recusa PC Windows, outro projeto Supabase, URL divergente, segredos obrigatórios ausentes, chave/hash WAHA diferentes, cadastro aberto e portas públicas auxiliares.
- Após configuração/autorização concreta, --apply no lugar de --plan: puxa apenas os sete serviços, confere Linux ARM em todos e labels de commit/origem nas três imagens próprias; grava overlay privado .limpax-runtime.compose.json e sobe com --no-build/--wait. Falha de pull não tenta build; não há fallback nem remoção de volumes. A subida não é transação: uma falha pode deixar parte dos serviços atualizada. Não promete rollback automático; preservar manifesto anterior, backup e plano de recuperação antes de atualizar.

WAHA fica no digest oficial ARM já registrado, engine NOWEB. Voz/telefonia não são ativadas. Os healthchecks do Compose não equivalem ao login/importação/WhatsApp aprovados: o aceite pelo navegador continua obrigatório. O fluxo não instala o agente de atualização upstream; atualizar a vertical com novo manifesto e o mesmo comando, depois das provas/backup, sem usar update.sh upstream.

Living System Checklist (infraestrutura): entrada=manifesto da release + .env privado; consumidor=Compose de produção, somente app/worker/scheduler/waha/redis/srh/caddy; log=mensagens sanitizadas da CLI + GitHub Actions; porta=este runbook; anti-morte=erro interrompe antes de up quando faltar prova, recuperação pelo manifesto/backup anterior; retorno=falha exige correção e nova medição na branch. Mapa=docs/architecture/limpax-arm.architecture.json.

Evidência final:23 testes da entrada e guardas de mapas/permissões aprovados no GitHub Linux ARM; sintaxe/ESLint, fragmento, plano com Compose real e suite shell completa aprovados. Execução https://github.com/italopabloferreria/DeskcommCRM/actions/runs/36823336516 no commit c4bd6a5f99ee9fa5c2b9c2e6756121e5b6194655. O apply/pull real não foi executado: suas recusas/sequência foram simuladas; o teste real do Compose resolveu somente configurações fictícias. Nenhuma imagem publicada/implantação efetuada. Backup/restore, manifesto próprio, acesso VPS e aceite hospedado seguem gates.

## Publicação ARM preparada — 01/10/2026

Nova infraestrutura da vertical: .github/workflows/limpax-arm-release.yml valida qualidade/Compose real/shell, constrói as três imagens ARM, executa as cinco sondas canônicas e publica exatamente as imagens carregadas/testadas em ghcr.io/italopabloferreria/limpaxcrm, limpaxcrm-worker e limpaxcrm-scheduler. Job de escrita exclusivo do fork/branch; GITHUB_TOKEN efêmero packages:write somente no job publicador. Não usa segredos Supabase, não altera tags stable/latest nem acessa VPS. Manifesto contém commit completo e três digests; tag inclui commit/run/tentativa. Helper recusa outra origem/arquitetura/contexto, inspeciona as três antes do primeiro push e não emite manifesto completo após falha parcial.

17 testes locais de publicador/permissões, sintaxe, ESLint dirigido e fragmento passaram. Publicação remota ainda não executada nesta evidência. Workflow roda por push relevante desta infraestrutura ou manual na vertical. Registro=GitHub logs/summary/artefato do manifesto; consumidor=limpax-arm-runtime.mjs; porta=runbook Oracle; falha exige correção/nova prova; mapa ARM inclui publicação e retorno ao instalador. Pacotes novos nascem privados por padrão segundo GitHub; conferir acesso anônimo ou preparar acesso restrito antes da VPS. Chrome retornou User unavailable; sem alterações de visibilidade. Não iniciar serviços pesados locais. Backup/restore,0495, acesso VPS/endereço HTTPS e aceite hospedado seguem pendentes. G13 aberto.


Fonte da visibilidade do registro: https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry
