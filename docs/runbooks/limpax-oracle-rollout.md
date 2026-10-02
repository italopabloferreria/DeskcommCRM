## Versão atual para instalar — 01/10/2026

O estado desta seção prevalece sobre os rascunhos e gates históricos abaixo. A rede pública Oracle já existe, mas as duas tentativas A1 2/12 e 1/6 em São Paulo AD-1 recusaram por capacidade insuficiente. Nenhuma VPS/IP/SSH/HTTPS existe; manter custo zero e aguardar capacidade, sem trocar automaticamente para recurso pago.

Imagens atuais: revisão `2a35ef53cb4297c553b22b2e941eae536ae64e4f`, manifesto `docs/releases/limpax/2a35ef53c-arm.json`. Run https://github.com/italopabloferreria/DeskcommCRM/actions/runs/36947068509 SUCCESS: gates e testes de documentos, lint/fragmentos, assets OCR, Compose real, suite shell completa, builds e sondas ARM antes da publicação. GHCR anônimo confirmou metadados linux/arm64, origem do fork e revisão nas três imagens por digest, sem baixar camadas. Não equivale a banco/WhatsApp/fluxos reais aprovados.

Num clone novo na futura VPS, copiar o manifesto **antes** de fixar a revisão das imagens. O HEAD documental posterior não passa na guarda exata do runtime. Exemplo após clone da branch `vertical/limpax`, origem conferida e árvore limpa:

```bash
install -d -m 700 /opt/limpaxcrm-releases
cp docs/releases/limpax/2a35ef53c-arm.json /opt/limpaxcrm-releases/2a35ef53c-arm.json
git checkout --detach 2a35ef53cb4297c553b22b2e941eae536ae64e4f
node scripts/limpax-arm-runtime.mjs --check-manifest /opt/limpaxcrm-releases/2a35ef53c-arm.json
```

São instruções preparadas; nenhum checkout/apply de VPS realizado. Configuração privada completa e URLs HTTPS autorizadas antecedem `--plan`/`--apply`. Backup administrativo privado e restauração em instalação descartável, preflight/ROLLBACK e 0495 seguem gates antes de importação real. O kit de recuperação agora interrompe em SQL inválido e verifica gzip previamente; sua execução real ainda não foi provada. G13 aberto, serviços locais pesados OFF. O restante deste arquivo é histórico; não instalar a revisão antiga por seguir um exemplo abaixo.

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

O manifesto JSON tem somente schema_version=1, revision=SHA completo e images com app/worker/scheduler. Cada referência deve ser ghcr.io/italopabloferreria/limpaxcrm (ou limpaxcrm-worker/limpaxcrm-scheduler) seguida de @sha256: e o digest real publicado. Manifesto próprio já publicado: docs/releases/limpax/0fd1ebba1-arm.json; evidência final na seção Publicação ARM concluída. Não usar hashes fictícios dos testes nem trocar para upstream. O projeto Compose é sempre limpaxcrm; usar outro nome cria outros volumes. Preservar esse nome nas atualizações e backups.

Na raiz do clone, o agente prepara a configuração e executa:
- node scripts/limpax-arm-runtime.mjs --check-manifest /caminho/manifesto.json: valida estrutura somente, sem rede.
- node scripts/limpax-arm-runtime.mjs --plan /caminho/manifesto.json: resolve o Compose real sem baixar imagem, iniciar serviço ou persistir overlay. Recusa PC Windows, outro projeto Supabase, URL divergente, segredos obrigatórios ausentes, chave/hash WAHA diferentes, cadastro aberto e portas públicas auxiliares.
- Após configuração/autorização concreta, --apply no lugar de --plan: puxa apenas os sete serviços, confere Linux ARM em todos e labels de commit/origem nas três imagens próprias; grava overlay privado .limpax-runtime.compose.json e sobe com --no-build/--wait. Falha de pull não tenta build; não há fallback nem remoção de volumes. A subida não é transação: uma falha pode deixar parte dos serviços atualizada. Não promete rollback automático; preservar manifesto anterior, backup e plano de recuperação antes de atualizar.

WAHA fica no digest oficial ARM já registrado, engine NOWEB. Voz/telefonia não são ativadas. Os healthchecks do Compose não equivalem ao login/importação/WhatsApp aprovados: o aceite pelo navegador continua obrigatório. O fluxo não instala o agente de atualização upstream; atualizar a vertical com novo manifesto e o mesmo comando, depois das provas/backup, sem usar update.sh upstream.

Living System Checklist (infraestrutura): entrada=manifesto da release + .env privado; consumidor=Compose de produção, somente app/worker/scheduler/waha/redis/srh/caddy; log=mensagens sanitizadas da CLI + GitHub Actions; porta=este runbook; anti-morte=erro interrompe antes de up quando faltar prova, recuperação pelo manifesto/backup anterior; retorno=falha exige correção e nova medição na branch. Mapa=docs/architecture/limpax-arm.architecture.json.

Evidência final:23 testes da entrada e guardas de mapas/permissões aprovados no GitHub Linux ARM; sintaxe/ESLint, fragmento, plano com Compose real e suite shell completa aprovados. Execução https://github.com/italopabloferreria/DeskcommCRM/actions/runs/36823336516 no commit c4bd6a5f99ee9fa5c2b9c2e6756121e5b6194655. O apply/pull real não foi executado: suas recusas/sequência foram simuladas; o teste real do Compose resolveu somente configurações fictícias. Nenhuma imagem publicada/implantação efetuada. Backup/restore, manifesto próprio, acesso VPS e aceite hospedado seguem gates.

## Publicação ARM concluída — 01/10/2026

Estado vigente; as seções seguintes são histórico. Commit das imagens: 0fd1ebba1e9b0880b5d8cfcab501e1a6e3cd5a0d. Execução https://github.com/italopabloferreria/DeskcommCRM/actions/runs/36824890913 concluída SUCCESS: 243 testes Linux, ESLint, fragmento de release, plano com Compose real e suite shell aprovados; app/worker/scheduler construídos em ARM nativo, arquitetura conferida, cinco sondas canônicas aprovadas e exatamente essas imagens publicadas no GHCR.

Manifesto real versionado em docs/releases/limpax/0fd1ebba1-arm.json, copiado do summary público da execução e validado com --check-manifest. Consulta anônima ao registro das três referências por digest e seus blobs de configuração confirmou disponibilidade de metadados, linux/arm64, origem do fork e revisão exata. Não foram baixadas camadas nem iniciados containers locais. Não foi necessário alterar visibilidade dos pacotes.

Destino=infraestrutura da vertical; workflow=.github/workflows/limpax-arm-release.yml; registro=logs/summary/manifesto; consumidor=scripts/limpax-arm-runtime.mjs; porta=docs/runbooks/limpax-oracle-rollout.md; mapa=docs/architecture/limpax-arm.architecture.json. Credencial efêmera packages:write somente no publicador exclusivo do fork/branch. Publicação não altera stable/latest upstream; falha interrompe e exige nova prova.

Próximo passo executável: completar acesso SSH/IPv4 da configuração Oracle e revisar configuração concreta antes da criação. Backup privado/restauração aguarda caminho autorizado do arquivo da senha atual (nunca enviar senha no chat). Migração0495 NÃO aplicada; nenhum dado real importado. VPS, HTTPS/endereço autorizado, pull/apply real e aceite hospedado de login/importação/exports/WhatsApp continuam pendentes. Sondas não comprovam banco real ou fluxos de cliente. Serviços locais pesados OFF; volumes preservados; G13 aberto.

Fonte do registro: https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry

## Fixar checkout e manifesto antes do plano — 01/10/2026

O manifesto foi registrado no commit documental a57f1f87b9254b7a6ed3310b5eb288fd622a3bf1, posterior ao commit das imagens. O runtime exige git HEAD igual a revision do manifesto. Portanto, não executar --plan/--apply no HEAD documental da branch: isso será recusado corretamente. Extrair o manifesto antes de trocar de revisão e guardá-lo fora do checkout. Em clone novo na VPS, após conferir origem e sem alterações locais:

```bash
# A pasta de releases fica fora do checkout; arquivo contém só referências públicas.
install -d -m 700 /opt/limpaxcrm-releases
git show a57f1f87b9254b7a6ed3310b5eb288fd622a3bf1:docs/releases/limpax/0fd1ebba1-arm.json > /opt/limpaxcrm-releases/0fd1ebba1-arm.json
git checkout --detach 0fd1ebba1e9b0880b5d8cfcab501e1a6e3cd5a0d
node scripts/limpax-arm-runtime.mjs --check-manifest /opt/limpaxcrm-releases/0fd1ebba1-arm.json
```

Usar diretório pertencente ao operador; não elevar o runtime inteiro para contornar permissão. O .env privado só é preparado depois de revisar o endereço HTTPS e as credenciais, sem versioná-lo. Executar --plan e somente depois --apply conforme os gates acima. Não apagar arquivos nem forçar checkout se a árvore estiver suja. Na atualização futura, preservar volumes, nome Compose limpaxcrm, manifesto anterior e backup.

Retomada desta sessão: Oracle no navegador do Codex abriu Cloud Sign In; sessão autenticada indisponível e login solicitado ao proprietário. Chrome indisponível para automação. OpenSSH/ssh-keygen presentes no Windows; pg_dump/psql ausentes do PATH. Nenhuma chave SSH, VM, regra de rede ou migração criada nesta sessão. Aguardar login e caminho explicitamente autorizado do arquivo da senha antes de prosseguir com tarefas dependentes.
