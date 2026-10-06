# LimpaxCRM — instalação na VPS do cliente

Estado em 05/10/2026: MVP local apresentável, sem VPS criada e sem HTTPS público validado. Este roteiro substitui a espera obrigatória por capacidade Oracle; não autoriza contratação nem cobrança pelo agente. Origem: decisão do titular de apresentar localmente e solicitar VPS ao cliente.

## Antes da instalação

Confirmar IP, acesso SSH por chave, arquitetura (`uname -m`), sistema operacional e hostname autorizado. O runtime `scripts/limpax-arm-runtime.mjs` atual aceita somente Linux ARM64 e mantém sete serviços em rede interna. Imagens ARM não devem ser usadas em VPS Intel/AMD: nesse caso validar o caminho x86 do instalador e gerar/verificar artefatos compatíveis antes de implantar. Recursos concretos e orçamento dependem da VPS contratada; ainda não definidos.

Revisão funcional corrigida: `9d164e1ecf825784f6447aed3f03e09d62b26957`. Publicação: [CI37376993451](https://github.com/italopabloferreria/DeskcommCRM/actions/runs/37376993451). Execução SUCCESS; as três imagens foram conferidas anonimamente: digests imutáveis, linux/arm64, origem e revisão exatas. Manifesto atual: `docs/releases/limpax/9d164e1ec-arm.json`, validado pelo runtime. Manifesto anterior427b524b1 não inclui as três correções do debug.

Manter Supabase operacional existente, clientes e Storage privados. A VPS executará aplicação e serviços; não reimportar planilha, recriar usuários ou substituir banco pelo backup de teste. Segredos ficam em configuração privada, fora Git; preservar as chaves criptográficas atuais para ler dados existentes. `.env` do runtime ARM exige permissão600 e recusa credencial administrativa do banco.

## Execução após acesso e artefatos aprovados

1. Confirmar clone do fork, árvore limpa, revisão e manifesto imutável correspondente. Guardar manifesto fora do checkout antes de fixar revisão, pois o runtime exige igualdade exata entre HEAD e imagens.
2. Preparar Docker/Compose e configuração privada no servidor. Não iniciar serviços pesados no computador de apresentação.
3. Revisar hostname HTTPS, URLs do app/webhook, Auth e origens permitidas. Domínio oficial `crm.limpaxdf.com.br` fica para etapa autorizada posterior; hostname temporário ainda precisa ser definido e resolvido para a VPS.
4. Liberar portas80/443. SSH somente para IP administrativo por chave. WAHA, Redis e ponte Redis HTTP permanecem internos; não publicar suas portas.
5. Validar manifesto e executar `--plan` antes de `--apply`. O plano não inicia serviços nem baixa imagens. Aplicação baixa imagens fixadas por digest, confere arquitetura/procedência e espera sondas; não faz build nem migração.
6. Conferir certificado HTTPS válido, redirecionamento HTTP, login/perfis, paginação de contatos, histórico, exportação, OCR e salvar/reabrir/baixar PDF privado. Inspecionar logs sem divulgar credenciais ou conteúdo de clientes.
7. Conectar somente número WhatsApp empresarial autorizado; testar entrada/saída e acompanhar saúde. Manter IA em teste até autorização específica para responder.
8. Validar desempenho e recuperação da instalação, registrar provas e fechar G13 antes de declarar produção liberada.

## Atualizações e recuperação

Não atualizar automaticamente por tag mutável. Antes de atualização: backup verificado, revisão/digests registrados, configurações privadas e volumes preservados. Banco continua no Supabase; migrações futuras exigem plano próprio, validação e autorização. Reversão da aplicação usa revisão/manifesto anterior compatível; não apagar dados para reverter imagem.

Pendências fora da instalação:94 observações sem identidade, vínculos explícitos das demais abas, domínio oficial, DocuSign e retorno manual de arquivos assinados pelo Gov.br. Não inferir clientes ou pagamento pelas cores da planilha.
## Fixação da release ARM

Somente no clone novo e limpo da VPS ARM, após confirmar origem e antes do plano:

```bash
install -d -m 700 /opt/limpaxcrm-releases
cp docs/releases/limpax/9d164e1ec-arm.json /opt/limpaxcrm-releases/9d164e1ec-arm.json
git checkout --detach 9d164e1ecf825784f6447aed3f03e09d62b26957
node scripts/limpax-arm-runtime.mjs --check-manifest /opt/limpaxcrm-releases/9d164e1ec-arm.json
```

Preparar `.env` privado e executar `--plan` com o mesmo manifesto; aplicar somente depois dos pré-requisitos acima. Estes comandos não foram executados em VPS; nenhum deploy foi realizado.
## Compatibilidade Intel/AMD conferida — 06/10/2026

Auditoria do código confirmou que `ubuntu-production-installer.sh` e `hostgator-setup-kit/_common.sh` aceitam x86_64/amd64, mas o namespace padrão do kit é `ghcr.io/melgarafael`. `docker-compose.prod.yml` também usa imagens upstream como fallback. Esse caminho não comprova presença das extensões Limpax: instalar a imagem original deixaria de entregar os ajustes próprios.

Verificação nesta etapa:37 testes de runtime/publicação passaram em2 arquivos. Invocação controlada do runtime atual com Linux x64 foi recusada antes de qualquer comando, download ou serviço; guardas ARM mantidas. Next3000 pertence ao fork e respondeu HTTP200. Não houve build, Docker local, migração ou alteração de clientes.

Para VPS Intel/AMD, executar sequência específica antes de instalar:

1. Confirmar arquitetura e acesso da máquina contratada.
2. Construir/publicar app, worker e scheduler Linux amd64 do fork, com a mesma revisão e namespace próprios; conferir digests, origem e sondas em runner remoto.
3. Adaptar o caminho de runtime para arquitetura explícita e validada, preservando recusas de manifesto, projeto Supabase, configuração privada e portas internas. Não contornar guarda ARM nem emular silenciosamente.
4. Conferir arquitetura/digests de WAHA, Redis, ponte Redis HTTP e Caddy; validar Compose com configuração fictícia antes de usar segredos reais.
5. Transferir configuração operacional privada preservando chaves criptográficas atuais. O instalador gera chaves apenas quando ausentes; não partir de instalação nova com chaves diferentes para dados já criptografados.
6. Registrar manifesto e só então executar plano/aplicação, seguido do aceite hospedado e G13.

Resultado: ARM está preparado; Intel/AMD exige artefatos e runtime próprios, ainda não implementados. Nenhuma VPS foi selecionada/contratada; evitar publicar novas variantes antes da definição da máquina. Esta auditoria não certifica instalação x86 ou produção.