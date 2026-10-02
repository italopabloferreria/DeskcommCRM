# Ativação do cadastro e histórico LimpaxCRM

Código preparado não significa banco operacional migrado. Este runbook registra
os gates da tarefa atual; não executa aplicação ou carga.

| Ordem | Gate | Evidência necessária | Estado em02/10/2026 |
|---|---|---|---|
| 1 | Recuperação | Restore do backup privado em Supabase descartável compatível, sem apontar o CRM ativo para ele | Pendente de destino separado |
| 2 | Preflight | Snapshot das funções/constraints/grants/RLS atuais; decisão de namespace0495/0507; ensaio transacional com ROLLBACK | Após recuperação |
| 3 | Aplicação | Autorização específica e resultado do preflight; migração incremental e provisionador; pós-validação e rollback documentados | Bloqueado pelos gates anteriores |
| 4 | Aceite | Instalação hospedada HTTPS; sessão legítima; carga sintética marcada; confirmação, replay, paginação, reversão, isolamento e suporte readonly | VPS gratuita/HTTPS ausentes |
| 5 | Dados reais | Identidade resolvida sem inferência por nome; correlação das colunas; filas auxiliares revisadas; autorização de carga e reconciliação | Revisão pendente |
| 6 | Produção | Gates operacionais, recuperação e aceite registrados; G13 aprovado | G13 aberto |

## Primeiro passo executável: provar a recuperação

O backup de01/10/2026 foi rechecado por SHA256 em02/10/2026: íntegro e igual ao
recibo `docs/evidence/limpax-backup-20261001.json`. Legibilidade/checksum não
comprovam recuperação. Não copiar o arquivo real para GitHub Actions ou ao fork.

Preparar destino separado privado e sem cobrança com PostgreSQL17 e as peças
compatíveis do Supabase (Auth, Storage, extensões incluindo vector/Vault).
Não restaurar no projeto ativo nem apenas em Postgres genérico, que não reproduz
as dependências reais. Credenciais ficam no ambiente privado, fora de Git/logs.
Preservar originais e dump; não resetar o banco ativo.

No destino, primeiro confirmar identidade administrativa e estrutura de Auth/Storage.
Restaurar papéis sem senhas e o arquivo custom com parada no primeiro erro,
registrando erros sanitizados e contagens por schema. Conferir constraints,
políticas e ACL contra o inventário do backup, além de dados existentes e acesso
de tenant. Storage tem zero objetos no recibo original; reconferir antes de carga.
Para recuperação de login, provar a configuração Auth e acesso legítimo no alvo,
sem disparar convites/e-mails ou alterar o administrador da instalação ativa.

Só registrar `restore_proven=true` após restauração integral e verificações;
falha parcial mantém o gate fechado. Registrar destino, versão, hash e resultados
em evidência sanitizada, sem URL com senha, PII ou conteúdo do arquivo.

## Depois da recuperação

0495 trata cadastro B2B e vínculos.0507 distribui funções do histórico e um
provisionador opcional: aplicar a fonte sozinho não cria as tabelas do módulo.
O provisionador é administrativo, com EXECUTE restrito ao service_role; não
expor sua chave ao navegador. Confirmar número ainda livre antes de aplicação.
Migrações já aplicadas são imutáveis: correção posterior sai em nova migração.

Ensaiar em transação com dados sintéticos e ROLLBACK: mesma fonte/decisões retorna
recibo; decisão divergente conflita; org alheia e membership revogada recusadas;
reversão anula serviços sem apagar origem; reenvio não restaura lote revertido;
falha no audit desfaz efeitos. Conferir RLS/grants e suporte/MFA além da API.

A planilha original de9 abas/5.050 linhas é maior que o upload de primeira aba/
2.000 linhas. Usar staging privado em lotes controlados e reconciliação com a
origem, sem truncar, recalcular macros ou descartar células/fórmulas. Filas de
identidade/endereço/serviço/auxiliares preservadas exigem decisão;4148 linhas com
nome não significam4148 clientes distintos. Arquivos idênticos não autorizam
mesclagem de clientes. Histórico vincula IDs já existentes; cadastro cadastral
é passo próprio, e notas de serviço não viram agenda futura ou receita.

Próximos módulos fora deste bloco: arquivo definitivo das emissões/retorno
assinado, DocuSign, OpenRouter, fiscal e domínio `crm.limpaxdf.com.br`.
