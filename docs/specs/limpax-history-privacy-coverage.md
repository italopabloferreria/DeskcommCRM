# Histórico Limpax — cobertura de dados pessoais

Conferência do bloco anterior em02/10/2026, revisão e531c7133. O bloco de
confirmação posterior prepara fonte0507/baseline/MANIFEST e reversão por lote.
Esta cobertura descreve código e bancada descartável, não o banco operacional.
Contrato atual: docs/specs/limpax-history-confirmation.md.

## Titularidade explícita e efeito

| Superfície | Critério e tratamento implementado | Limite |
| --- | --- | --- |
| Pessoa sem contato ativo | Organização + person_id; admin confirma. Nome substituído, nome normalizado/e-mail/notas limpos; marcador persiste. | Não identifica titular por nome parecido. |
| Vínculos company_people | Mesmo person_id/organização; cargo, departamento e notas limpos. Guarda recusa restauração destes campos. | Empresa e identificadores do vínculo ficam preservados. |
| Linhas import_rows | Mesmo person_id/organização; raw_data/normalized_data/error limpos. Guarda recusa nova cópia pessoal. | Linhas só empresariais ou sem titular explícito não são atribuídas por inferência. |
| Serviços históricos da pessoa | Bruto, referência e notas originais/correntes limpos; data/valor/moeda substituídos por null; redacted_at marcado. | IDs e relacionamento estrutural permanecem; não prometer anonimização matemática. |
| Locais da pessoa | Endereço original substituído por marcador; novas inserções pessoais recusadas. | Endereço de empresa compartilhado exige análise própria. |
| Pessoa com contato ativo | Novo comando recusa. Fluxo de anonimização do contato existente estende limpeza ao histórico e à observação corrigida. | Telefone compartilhado não é apagado pelo comando de pessoa sem contato. |
| Recibos/audit | Mantêm IDs, hash, motivo, versão e contagem; replay não recria bruto pessoal. | Não há prazo automático de retenção definido nesta etapa. |
| Exportação direta | Admin; snapshot SQL estável de pessoa, vínculos, import_rows, locais e serviços. Limites10000 por tabela e16MiB; excesso recusa sem truncar. | Escopo person_profile_and_history, não todos os módulos do CRM. |
| Exportação por contato | Coletor existente inclui histórico no JSON/PDF e recusa coleta incompleta. | Coletor paginado existente não é snapshot transacional global. |

## Superfícies que não pertencem a este comando

- Planilha/PDF original, staging privado, objetos de documentos, downloads anteriores,
  cópias organizacionais e backups: inventariar titularidade/acesso e processo de descarte
  separado. Não apagar automaticamente como consequência de um clique no CRM.
- Texto livre vinculado somente a empresa ou linha auxiliar: pode conter dados pessoais,
  mas não há person_id que autorize atribuição automática. Decisão explícita de identidade
  e escopo é necessária antes de limpeza; nomes repetidos não provam identidade.
- Emissão fiscal, assinatura certificada, numeração definitiva e retenção contratual:
  não foram criadas ou presumidas neste bloco.

## Próxima ordem executável

1. Inventário técnico concluído nos quatro diretórios declarados em02/10/2026;
   contagens em docs/evidence/limpax-data-inventory-20261002.json. Caminhos/checksums
   privados fora do Git; não cobre downloads antigos ou cópias cloud desconhecidas.
2. Registrar as decisões de titularidade/retenção que dependem do proprietário como
   [VALIDAR], sem transformar deduplicação por nome em vínculo.
3. Comprovar restauração administrativa num destino Supabase compatível e descartável.
4. Fonte0507 e confirmação/recibo/reversão preparados: preflight/aplicação autorizada
   e aceite hospedado continuam após recuperação, antes de liberar importação real.
   Sequência em docs/runbooks/limpax-history-activation.md. Nunca marcar G13 apenas
   por testes de componente.

## Fontes verificadas

- supabase/drafts/limpax_history_management.sql — comando, guardas e exportação.
- supabase/drafts/limpax_history_lifecycle.sql — evento por contato existente.
- lib/crm-b2b/history-management.ts — contratos e limites da API.
- app/api/v1/customer-history/[kind]/[id]/route.ts — papéis/origem/suporte e ausência opcional.
- docs/specs/limpax-history-lifecycle.md — contrato de integração e gates.
- docs/runbooks/limpax-import-rollout.md — backup e restauração exigidos.
- docs/evidence/limpax-history-full-block-20261002.json — resultado da bancada e suas limitações.

No bloco anterior,43 casos distintos passaram emPG15/17 (86 execuções). O bloco
posterior mantém essa prova e adiciona confirmação/reversão canônica: 52 casos
passaram em PG15/17 (104 execuções), com evidência em
`docs/evidence/limpax-history-confirmation-20261002.json`. Testes não instalam SQL
no banco ativo nem comprovam
eliminação de cópias externas. Nenhum dado real foi carregado neste bloco.
