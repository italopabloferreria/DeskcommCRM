# Auditoria local LimpaxCRM — 05/10/2026

Escopo autorizado: depuração do MVP local enquanto cliente avalia contratar VPS. Skills: systematic-debugging, verification-before-completion e test-driven-development. Servidor Next existente3000 preservado, sem Docker/WAHA/build completo, sem migração nem alteração de dados de clientes.

## Corrigido

1. Paginação de contatos ordenados por última atividade podia parar antes dos contatos com valor NULL. Causa: filtro do cursor não incluía a região NULL apesar de nullsFirst:false. Incluída essa região tanto ascendente quanto descendente; cursor já nulo continua por id. Dois testes falharam antes e passaram após correção.
2. Selecionar cliente em Documentos podia manter destinatário literal anterior e vincular PDF ao novo contato. Seleção agora atualiza destinatário para {{cliente.nome}}. Edição manual continua preservando destinatário específico; teste anterior mantido. Reprodução nova falhou antes e passou depois.
3. Busca de contatos em Documentos falhava com empresas404 quando módulo B2B opcional estava desligado. Somente consulta opcional de empresas aceita404 como lista vazia; outros erros continuam visíveis. Reprodução nova falhou antes e passou depois.

## Verificação

- Auditoria importação/histórico/documentos:27 arquivos/160 testes aprovados.
- Regressão contatos/documentos:6 arquivos/18 testes aprovados (inclui3 testes repetidos da auditoria).
- Typecheck integral tsconfig.typecheck.json:exit0.
- ESLint direcionado aos5 arquivos alterados e git diff --check:exit0.
- Interface autenticada em aba separada: buscou fixture NÃO UTILIZAR, selecionou e confirmou destinatário {{cliente.nome}}, nome preenchido e vínculo indicado. Não salvou PDF/modelo, não criou cliente, original em edição preservado. Prova PNG privada debug-document-selection-20261005.png, foraGit.
- Guards documentos, origem e Storage por organização inspecionados; nenhum bypass comprovado. Não equivale à execução integral da suíte de RLS.

## Limites e decisões

Não removi módulos por serem opcionais ou não configurados; não foi identificado código morto que pudesse ser apagado com segurança. Dashboard foi consolidado para remover estados contraditórios; histórico detalhado permanece HANDOFF-LIMPAX.md. Não rodei suíte global de milhares de testes, invariantes de banco, build completo ou bancada VPS nesta etapa. Ambiente Next desenvolvimento não comprova desempenho de produção. Avisos de ausência de IA/suporte e configuração nativa futura Vite não foram escondidos.

MVP local apresentável. Produção/G13 permanece aberto. Cliente avaliará contratação de VPS; não autoriza cobrança por agente. Após correção funcional será necessário usar nova release/imagens, não instalar manifesto427b524b1 como se contivesse estes ajustes.94 observações sem identidade e históricos das outras abas permanecem preservados para associação explícita, sem mesclagem automática.
