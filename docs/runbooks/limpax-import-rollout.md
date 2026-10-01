# LimpaxCRM — ativação da importação segura

Destino exclusivo: Supabase isolado bzretxzwnudtpxmoqjyv. Não usar lkamarbpjqlibxlmcico. Migração: supabase/migrations/20261001060000_0495_importacao_b2b_atomica.sql.

## Resultado preparado

Uma chamada RPC grava o lote; cada linha tem uma subtransação. Erros de entrada e conflitos desfazem todas as escritas daquela linha. Erro inesperado desfaz o lote inteiro. A trava de transação por organização recusa uma segunda importação enquanto a primeira roda. O fingerprint é calculado no banco a partir das linhas e do mapeamento; replay devolve o mesmo lote sem repetir os efeitos. Corrigir o arquivo cria outro fingerprint; reenviar o mesmo arquivo com falhas devolve o resultado anterior.

O código novo recusa com 503 se a função estiver ausente. Não há fallback para escritas parciais. Não reimplantar imagem upstream padrão: usar imagem do fork com estas alterações.

## Ordem de aplicação

1. A autorização específica para backup, preflight, prova sintética com ROLLBACK e aplicação condicional da 0495 já foi dada. Confirmar projeto/branch/versão, políticas das cinco tabelas B2B e contacts, papel do proprietário e contagens antes da mudança. Confirmar backup privado com processo de restauração; CSV não é backup. Nunca salvar dump no Git.
2. Executar a migração e a prova sintética dentro de BEGIN/ROLLBACK primeiro. Não criar nova conta Auth, convidar pessoa ou enviar mensagem. Usar a sessão simulada do proprietário já existente. Se o teste falhar, não persistir a migração.
3. Aplicar somente a migração 0495 após a prova; conferir coluna/índice, assinatura, security invoker, EXECUTE negado a anon e service_role, e permitido a authenticated, com guard manager no corpo. A migração não modifica clientes existentes.
4. Executar prova sintética e concorrência com duas conexões em transações revertidas; comparar contagens finais. O teste offline não substitui essa etapa.
5. Na hospedagem de teste, verificar seleção de colunas, confirmação, replay, erro por linha e os três downloads CSV. Validar com uma cópia fictícia da estrutura da planilha do cliente antes de carga real.
6. Publicar a imagem verificada, configurar HTTPS/login e concluir o gate de uso real. Cliente real só entra depois de aceite, backup/recuperação e separação dos registros DEMO.

### Prova de backup exigida no passo 1

O `scripts/backup-db.sh` compartilhado **não** satisfaz este gate: exporta apenas `public`, aceita a URL do papel da aplicação (que pode produzir um dump parcial com sucesso) e não prova restauração. Também não inclui os arquivos binários do Storage. Não usá-lo como evidência para aplicar a 0495.

Em diretório privado fora do Git, obter uma exportação administrativa consistente do banco isolado que cubra ao menos `public`, `auth` e metadados de `storage`; registrar versão das ferramentas, projeto, horário, tamanho e checksum sem registrar a URL/senha. Inventariar separadamente objetos do Storage, segredos/configuração de Auth e sessões/volumes do WAHA: o dump SQL sozinho não recupera esses componentes. Restaurar a exportação em **banco descartável separado**, conferir tabelas, funções, contagens e login de teste sintético; não apontar a restauração para o projeto ativo. Se alguma parte não puder ser exportada ou restaurada, registrar a lacuna e interromper a aplicação da 0495 até haver plano de recuperação verificável. Manter os arquivos privados e restritos; nunca anexar dumps a CI, issue ou commit.

Referências: [backups do Supabase](https://supabase.com/docs/guides/platform/backups) e [procedimento de backup/restauração](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore).

O kit `hostgator-setup-kit/backup.sh` já exporta o banco inteiro e pode ser aproveitado quando houver VPS e conexão administrativa verificada. Ele agora restringe a pasta de backups a modo 700 e cria dumps com umask 077. O fallback de conexão do kit ainda exige conferir que o papel utilizado é administrativo: ter um arquivo legível não comprova cobertura de todas as tabelas. Em Supabase hospedado, os binários do Storage continuam fora desse dump.

`hostgator-setup-kit/restore.sh` verifica o gzip antes de abrir a conexão e para no primeiro erro SQL (`ON_ERROR_STOP=1`), sem anunciar sucesso ou restaurar anexos após a falha. **Isso não torna a restauração atômica:** comandos anteriores ao erro podem ter sido aplicados. A prova deve acontecer numa instalação descartável separada, com seu próprio `.env` apontando ao banco de teste; o script carrega o `.env` da instalação e não deve ser executado na pasta ativa para simular recuperação. Nenhum desses scripts foi executado contra o Supabase real nesta etapa.

## Backup real exportado em 01/10/2026

Conexão administrativa do projeto isolado validada com CA oficial e hostname. Exportação custom por pg_dump17.11 concluída fora do Git em pasta com ACL restrita ao proprietário. Decodificação integral e checksum aprovados; arquivo contém 186 tabelas public, 27 auth e 8 storage, 632 políticas e 844 entradas ACL. Papéis exportados sem senhas. Nove buckets e nenhum objeto Storage no inventário. Recibo sem credenciais: [limpax-backup-20261001.json](../evidence/limpax-backup-20261001.json).

**Restauração ainda NÃO comprovada.** As extensões incluem vector e supabase_vault; o destino deve ser Supabase compatível e separado do projeto ativo. Nenhum banco local/Docker foi iniciado, nenhuma0495 aplicada. Autenticação/configuração externa e volumes WAHA exigem recuperação própria, além do dump. Próximo: obter o destino isolado e conferir schema, contagens, políticas e login após restore; não aceitar apenas leitura do arquivo como gate.

## Interrupção e reversão

Se a conexão cair antes do commit, PostgreSQL desfaz o lote. Se cair depois do commit, reenviar a mesma planilha recupera o recibo pelo fingerprint. Não apagar registros para tentar novamente.

Se precisar suspender, revogar EXECUTE de authenticated na função e manter a UI de importação indisponível. Preserve source_fingerprint, índice, lotes e clientes; não usar DROP COLUMN nem excluir dados. Não reativar o importador antigo, que fazia escritas parciais.

## Evidência local em 01/10/2026

26 testes de componente/rotas/processamento passaram, além de ESLint dirigido e TypeScript focado. O verificador scripts/verify-limpax-import-sql.mjs executou a migração real em PGlite com DDL/RLS B2B da 0448 e core mínimo: 13 verificações de replay, dedupe, subtransação, rollback total, papel, organização e reaplicação passaram. Foi preparado tests/invariants/importacao-b2b-atomica.test.ts para baseline completo e duas conexões PostgreSQL; NÃO foi executado porque Docker segue desligado por pedido do proprietário. PGlite usa uma conexão, não prova concorrência real nem todos os triggers do baseline.

Referências: [funções Supabase](https://supabase.com/docs/guides/database/functions), [PGlite](https://pglite.dev/docs/). O changelog Supabase de 25/09/2026 foi conferido; esta função não usa ltree, cifras PGP legadas, btree_gist ou operadores personalizados.
