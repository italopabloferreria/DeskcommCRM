# LimpaxCRM — ativação da importação segura

Destino exclusivo: Supabase isolado bzretxzwnudtpxmoqjyv. Não usar lkamarbpjqlibxlmcico. Migração: supabase/migrations/20261001060000_0495_importacao_b2b_atomica.sql.

## Resultado preparado

Uma chamada RPC grava o lote; cada linha tem uma subtransação. Erros de entrada e conflitos desfazem todas as escritas daquela linha. Erro inesperado desfaz o lote inteiro. A trava de transação por organização recusa uma segunda importação enquanto a primeira roda. O fingerprint é calculado no banco a partir das linhas e do mapeamento; replay devolve o mesmo lote sem repetir os efeitos. Corrigir o arquivo cria outro fingerprint; reenviar o mesmo arquivo com falhas devolve o resultado anterior.

O código novo recusa com 503 se a função estiver ausente. Não há fallback para escritas parciais. Não reimplantar imagem upstream padrão: usar imagem do fork com estas alterações.

## Ordem de aplicação

1. Obter autorização específica para migração e testes sintéticos no projeto isolado. Confirmar projeto/branch/versão, políticas das cinco tabelas B2B e contacts, papel do proprietário e contagens antes da mudança. Confirmar backup privado com processo de restauração; CSV não é backup. Nunca salvar dump no Git.
2. Executar a migração e a prova sintética dentro de BEGIN/ROLLBACK primeiro. Não criar nova conta Auth, convidar pessoa ou enviar mensagem. Usar a sessão simulada do proprietário já existente. Se o teste falhar, não persistir a migração.
3. Aplicar somente a migração 0495 após a prova; conferir coluna/índice, assinatura, security invoker, EXECUTE negado a anon e service_role, e permitido a authenticated, com guard manager no corpo. A migração não modifica clientes existentes.
4. Executar prova sintética e concorrência com duas conexões em transações revertidas; comparar contagens finais. O teste offline não substitui essa etapa.
5. Na hospedagem de teste, verificar seleção de colunas, confirmação, replay, erro por linha e os três downloads CSV. Validar com uma cópia fictícia da estrutura da planilha do cliente antes de carga real.
6. Publicar a imagem verificada, configurar HTTPS/login e concluir o gate de uso real. Cliente real só entra depois de aceite, backup/recuperação e separação dos registros DEMO.

## Interrupção e reversão

Se a conexão cair antes do commit, PostgreSQL desfaz o lote. Se cair depois do commit, reenviar a mesma planilha recupera o recibo pelo fingerprint. Não apagar registros para tentar novamente.

Se precisar suspender, revogar EXECUTE de authenticated na função e manter a UI de importação indisponível. Preserve source_fingerprint, índice, lotes e clientes; não usar DROP COLUMN nem excluir dados. Não reativar o importador antigo, que fazia escritas parciais.

## Evidência local em 01/10/2026

26 testes de componente/rotas/processamento passaram, além de ESLint dirigido e TypeScript focado. O verificador scripts/verify-limpax-import-sql.mjs executou a migração real em PGlite com DDL/RLS B2B da 0448 e core mínimo: 13 verificações de replay, dedupe, subtransação, rollback total, papel, organização e reaplicação passaram. Foi preparado tests/invariants/importacao-b2b-atomica.test.ts para baseline completo e duas conexões PostgreSQL; NÃO foi executado porque Docker segue desligado por pedido do proprietário. PGlite usa uma conexão, não prova concorrência real nem todos os triggers do baseline.

Referências: [funções Supabase](https://supabase.com/docs/guides/database/functions), [PGlite](https://pglite.dev/docs/). O changelog Supabase de 25/09/2026 foi conferido; esta função não usa ltree, cifras PGP legadas, btree_gist ou operadores personalizados.
