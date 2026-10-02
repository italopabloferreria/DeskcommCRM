# Recuperação LimpaxCRM: inventário e comparação privada

Ferramenta: `scripts/limpax-recovery-preflight.ts`. Somente leitura; não restaura,
não aplica migrações e não aprova G13. A sequência operacional permanece em
`docs/runbooks/limpax-history-activation.md`.

## O que já foi executado

Em 02/10/2026, o checksum e a cobertura do backup de 01/10 foram conferidos e
o banco `bzretxzwnudtpxmoqjyv` foi consultado com TLS verificado, timeout e
transação REPEATABLE READ / READ ONLY encerrada por ROLLBACK. Inventário:
186 tabelas public, 27 auth, 8 storage e 1 vault; 632 políticas; zero objetos
Storage e zero segredos Vault. O arquivo possui 820 ACL e 24 DEFAULT ACL,
totalizando as 844 entradas do recibo. Nenhuma escrita no banco.

O manifesto privado guarda contagens, hashes SHA256 do conteúdo ordenado,
hashes de colunas/constraints/índices/gatilhos/grants e catálogo de funções,
políticas e privilégios padrão. Não guarda nomes, telefones, e-mails, valores de
células, senhas ou corpos SQL. Ainda assim, mantenha-o privado: nomes técnicos
e hashes derivados do banco não são material para publicação.

A conta Supabase exibiu limite de dois projetos gratuitos e desabilitou a
criação de outro. Nenhum projeto foi pausado, apagado ou alterado para liberar
quota; nenhum plano pago foi contratado. A restauração continua sem destino.

## Capturar uma referência

Executar na raiz do fork com as ferramentas PostgreSQL 17 já instaladas.
Guardar conexão e relatório em diretório privado fora de qualquer checkout:
modo 700 no Linux; no Windows, ACL herdada exclusivamente do proprietário.
O script recusa saída dentro do próprio checkout, pai ligado ao checkout e
arquivo de saída existente. Conferir a ACL Windows antes de usar outro local.

O JSON privado de conexão contém exclusivamente `host`, `port` (5432), `user`,
`password` e `database` (`postgres`). O host/usuário deve corresponder à referência
declarada: conexão direta ou Session pooler Supabase. Nunca passar senha na linha
de comando. Variáveis PG herdadas são descartadas; TLS não pode ser desligado.

```bash
pnpm exec tsx scripts/limpax-recovery-preflight.ts \
  --mode capture --project-ref bzretxzwnudtpxmoqjyv \
  --connection-file /PRIVATE/source-connection.json \
  --tools-dir /POSTGRES17/bin --ca /PRIVATE/supabase-ca.crt \
  --archive /PRIVATE/limpax.dump \
  --receipt docs/evidence/limpax-backup-20261001.json \
  --output /PRIVATE/source-inventory.json
```

Os caminhos são exemplos; não criam nem abrem um destino. O inventário é um
snapshot do momento da consulta, não necessariamente do momento do dump. Antes
da prova final, congelar escritas ou usar exportação/snapshot coordenado; uma
divergência exige apuração, não ignorar linhas para obter verde.

## Comparar após restauração autorizada em destino separado

Usar a conexão administrativa do destino, sua própria CA e sua referência.
O script recusa destino com a mesma referência da origem e o Supabase antigo
`lkamarbpjqlibxlmcico` antes de iniciar psql. Não mudar o runtime ativo para o alvo.

```bash
pnpm exec tsx scripts/limpax-recovery-preflight.ts \
  --mode compare --project-ref REF_DO_DESTINO \
  --connection-file /PRIVATE/target-connection.json \
  --tools-dir /POSTGRES17/bin --ca /PRIVATE/target-ca.crt \
  --source-manifest /PRIVATE/source-inventory.json \
  --output /PRIVATE/target-comparison.json
```

Saída 2 significa diferenças. As contagens, conteúdo, estrutura, RLS, extensões,
políticas e catálogo devem coincidir; diferenças de versão/plataforma devem ser
investigadas. Não alterar o manifesto para mascarar divergência. Banco equivalente
ainda retorna `restore_proven=false`: configuração Auth, login legítimo, chaves
externas, arquivos Storage e volumes WhatsApp são verificações separadas. Vault
ou Storage com conteúdo impedem aprovação automática dessa comparação.

Referências: [backup e restore Supabase](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore),
[hashes PostgreSQL 17](https://www.postgresql.org/docs/17/functions-binarystring.html).
