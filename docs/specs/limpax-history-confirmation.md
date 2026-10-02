# Confirmação e reversão da importação histórica

## Caminho executável

`/app/imports` → arquivo CSV/XLSX (2MiB, primeira aba, até2000 linhas) → revisão
por páginas de25 → clientes já cadastrados escolhidos explicitamente por ID →
validação sem escrita → aceite → POST `/api/v1/imports` → RPC transacional →
recibo e link para `/app/imports/[id]`. A confirmação reabre o mesmo arquivo,
calcula SHA256 no servidor e valida todas as decisões de novo. UUID não é
autorização: o SQL confere organização/cliente/local sob locks.

Cliente nunca nasce por inferência do nome no fluxo histórico. O cadastro B2B
continua com importador próprio0495. Endereços, células extras, zero, data e
observação originais são preservados; notas não viram receita ou agenda futura.
Data/valor ilegíveis e identidade ambígua mantêm o lote bloqueado para revisão.
Auxiliares conservam células brutas e não viram serviços.

Organização vem da sessão; papel mínimo manager, suporte readonly recusado.
Histórico mutante exige origem exata. Corpo multipart transmitido é limitado
a dois arquivos de2MiB mais64KiB, independente de Content-Length. SQL exige
membership aceita/não revogada, MFA quando exigido, trava compartilhada com0495
e comando inteiro atômico. Erro no último efeito desfaz lote, linhas e auditoria.
Sem RPC/tabelas instaladas responde409 e não usa escrita por linha como fallback.

Recibo inclui lote, total, serviços, locais, auxiliares e reused. Mesma origem e
decisões retorna o mesmo recibo; decisões diferentes conflitam. Queda de rede
não anuncia sucesso: conservar revisão e reenviar arquivo/decisões para conferir.
SQL grava audit de IDs/contagens na mesma transação, sem auditoria duplicada na API.

## Reversão administrativa

GET `/api/v1/imports/[id]` pagina50 linhas + cursor numérico e retorna recibo,
reversed_at e can_reverse. Nunca entrega apenas500 linhas como se fosse o lote
inteiro. Erro de linhas/recibo recusa resposta parcial; tudo private/no-store.

Admin marca confirmação explícita na ficha e POST
`/api/v1/imports/[id]/history-reversal` manda request_id UUID persistido entre
tentativas. SQL confere papel, suporte/MFA/tenant, trava importação, bloqueia
serviços do lote e recusa revisão!=0, anulação ou anonimização prévia. Reversão
marca voided_at e aumenta revisão. Cadastros, contatos, locais, bruto, lote e
recibos permanecem; não é exclusão física nem reversão da importação cadastral.
Erro na auditoria desfaz a reversão inteira. Replay não gera nova auditoria;
arquivo revertido retorna reversed_at e não recria os serviços.

## Instalação opcional e recuperação

Fonte: `supabase/migrations/20261002095906_0507_limpax_historico_confirmacao.sql`,
mesmo corpo no baseline antes da varredura de anon, linha MANIFEST. CLI oficial
gerou o nome após main/refs/69 PRs serem medidos; isso não reserva o número.
Conferir colisões novamente antes de merge/upstream ou aplicação.

Baseline só distribui funções fixas. `fn_limpax_historico_provisionar()` cria
as tabelas e gatilhos opcionais, reaplicável; EXECUTE somente service_role.
Provisionador interno não é público nem liberado ao service_role. Sessões
autenticadas podem executar comandos guardados, nunca escrever recibos.
Nenhuma chamada a provisionador existe automaticamente no baseline.

Sequência operacional obrigatória: restore administrativo isolado Supabase
compatível → preflight/ROLLBACK0495/0507 → aplicação autorizada/provisionamento
→ aceite autenticado hospedado → decisões globais de identidade → carga real
especificamente autorizada. G13 continua aberto até estas provas.

Documentação consultada: [funções PostgreSQL no Supabase](https://supabase.com/docs/guides/database/functions)
e [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).

## Living System Checklist

- Entrada: tela Importações já no mapa/menu e ficha do lote por recibo.
- Duas conexões: revisão → API → comando SQL; recibo → ficha → reversão → audit.
- Efeito mensurável: total/serviços/locais/auxiliares; contra-medida: nenhuma
  escrita se pendência, conflito ou falha. Audit transacional IDs/contagens.
- Continuidade: erro preserva decisões, reenvio confere recibo; conflito exige revisão.
- Permissões: manager importa, viewer lê, admin reverte; origem/tenant/MFA/suporte.
- Mapa fonte atualizado; nenhuma integração externa ou mensagem foi introduzida.
- Prova: componente não substitui E2E visual autenticado hospedado.

## Privacidade e inventário

Inventário privado em02/10/2026:346 originais,20 artefatos de staging,17 cópias
de análise e43 arquivos de ferramentas/backup.3 grupos de arquivos idênticos,
4 cópias excedentes no conjunto inventariado; isso não prova duplicidade de
clientes. Nenhuma exclusão/mesclagem ou upload remoto. Relatório público só
agregados em docs/evidence/limpax-data-inventory-20261002.json; relatório com
caminhos/checksums permanece fora dos repositórios. Titularidade de texto
empresarial/auxiliar e retenção de originais/exports/backups continuam [VALIDAR].
