# LimpaxCRM — plano de entrada em uso

> **For agentic workers:** Use a skill executing-plans para executar este plano por tarefa, nesta conversa. Não delegar sem autorização. Etapas usam checkboxes para registrar conclusão.

**Goal:** Colocar o LimpaxCRM em uso com hospedagem, recuperação comprovada, importação sem perda e fluxos autenticados verificados.

**Architecture:** Site público permanece no repositório Limpax. CRM usa o fork DeskcommCRM com Supabase isolado. App, worker, scheduler e WhatsApp serão hospedados fora do computador pessoal; banco e documentos privados permanecem no Supabase.

**Tech Stack:** Next.js, TypeScript, Supabase, Docker/Compose, WAHA e imagens ARM publicadas pelo GitHub.

**Spec:** docs/HANDOFF-LIMPAX.md, docs/LIMPAX_DIFFERENCES.md e C:\Users\italo\Programação\Limpax\docs\CURRENT_TASK.md.

## Restrições globais

- CRM ativo em C:\Users\italo\Programação\01_PROJETOS\DeskcommCRM; branch vertical/limpax.
- Supabase isolado bzretxzwnudtpxmoqjyv. Banco antigo, D1/R2 e site público preservados.
- Não criar recursos pagos, mudar DNS, importar dados reais, convidar ou enviar mensagens sem autorização específica vigente.
- Não executar builds pesados, Next ou Docker locais enquanto a restrição de RAM estiver vigente.
- Ítalo e outros administradores podem convidar. Cadastro público fechado.
- Clientes vêm de planilhas; OCR serve para contratos/documentos reutilizáveis.
- Não declarar produção antes do aceite final G13.
- Planejamento de etapas futuras não autoriza sua implementação fora da tarefa ativa.

## Estado confirmado em 01/10/2026

| Área | Entrega | Limite atual |
| --- | --- | --- |
| Base CRM | Frontend/login Deskcomm com identidade LimpaxCRM; empresas/pessoas/contatos/funis/tarefas/agenda/propostas | Existência de módulo herdado não equivale a aceite completo |
| Banco | Baseline separado, 186 tabelas públicas com RLS; proprietário cadastrado | Google desativado no novo projeto; entrega de convites e matriz real de papéis pendentes |
| Demonstração | 12 conjuntos de empresas/pessoas/contatos/oportunidades, tarefas, agenda e proposta fictícia | Não são a base real e não devem ser confundidos com operação |
| Planilhas | Mapeamento/prévia CSV/XLSX, exportações CSV e proteções | Importação atômica0495 não aplicada; XLSM real/histórico/endereço ainda não cobertos integralmente |
| Documentos | OCR pt-BR, modelos editáveis, variáveis de cliente, PNG de assinatura/carimbo e versões privadas | PDF é prévia; sem arquivo definitivo de emissões/numeração/fiscal/DocuSign |
| Storage documental | Teste sintético real aprovado e objetos de teste removidos | Aceite HTTP autenticado da tela permanece pendente |
| WhatsApp | Conexão WAHA local previamente verificada | Serviço desligado; fluxo hospedado e mensagens ainda não validados |
| Recuperação | Backup administrativo privado gerado e íntegro | Restauração em instalação Supabase descartável não comprovada |
| Release | App/worker/scheduler ARM da revisão2a35ef53c publicados; workflow36947068509 aprovado | Imagens publicadas não significam aplicação implantada |
| Oracle | Rede preparada, franquia200 GB livre e chave pública preparadas | Criação autorizada recusada por capacidade A1 AD-1; nenhuma VPS/IP/HTTPS |

## Árvore de decisões vigentes

```text
Limpax / iCBAI
├── Site público: manter repositório Limpax e hospedagem existente
└── LimpaxCRM: fork DeskcommCRM
    ├── Identidade: LimpaxCRM, logo/cores Limpax; iCBAI desenvolvimento
    ├── Acesso: login padrão, cadastro fechado, convites por administradores
    │   └── Google: configurar separadamente no novo Supabase
    ├── Dados: Supabase isolado
    │   ├── Cadastro: empresas, pessoas, contatos e vínculos
    │   ├── Planilha: origem rastreável + mapeamento + revisão de duplicados
    │   └── Recuperação: backup → restauração comprovada → migração → carga
    ├── Documentos: escaneado → OCR → revisão → modelo → cliente → PDF
    │   ├── Assinatura/carimbo PNG: aplicação visual manual
    │   ├── Gov.br: portal externo, retorno manual planejado
    │   └── DocuSign: integração futura com credenciais próprias
    ├── WhatsApp: WAHA hospedado → pareamento → testes autorizados
    ├── IA: OpenRouter solicitado, configuração e aceite pendentes
    └── Hospedagem: tentativa Oracle gratuita
        ├── Capacidade disponível: instalar release fixa → HTTPS → aceite
        ├── Sem capacidade: aguardar nova tentativa; sem cobrança
        └── Domínio futuro: crm.limpaxdf.com.br; DNS adiado
```

## Tarefa 1 — preparar a base real sem escrever no banco

**Arquivos/fontes:** C:\Users\italo\Programação\Limpax\docs\LIMPAX_DATA_DISCOVERY.md; pasta Documentos autorizada; scripts/seed-limpax-demo.mjs apenas como referência para separar demonstração.

**Entrada:** XLSM com nove abas e 4.148 linhas com nome na aba CADASTRO. **Saída:** staging privado rastreável, relatório de ambiguidades e cobertura dos campos; nenhum dado pessoal no Git.

- [ ] Inventariar colunas e separar cadastro, contatos, locais e histórico de serviço; preservar valores brutos e origem aba/linha.
- [x] Registrar conflitos de ID/telefone/documento/endereço; nome igual não autoriza mesclagem automática.
- [x] Produzir relatório com contagens de candidatos, conflitos e campos ainda sem destino.
- [x] Planejar lotes de até2.000 linhas após transformação revisada; não executar macros ou carga remota.
- [x] Definir extensões necessárias para endereço/local/histórico antes de uma carga que perderia esses campos.

**Evidência da preparação:** C:\Users\italo\Programação\Limpax\docs\LIMPAX_STAGING_REVIEW.md. Campos preservados e destinos propostos; classificação final e implementação dos destinos pendentes. Documento de identidade não consta nas sete colunas CADASTRO; nenhum foi inferido.

**Aceite:** cada campo original tem destino ou exclusão explícita; nenhuma linha some silenciosamente. Trabalho possível sem VPS; não constitui autorização para importar.

## Tarefa 2 — obter ambiente e comprovar recuperação

**Arquivos:** docs/runbooks/limpax-oracle-rollout.md; docs/evidence/limpax-backup-20261001.json; backup privado fora do Git.

**Entrada:** backup administrativo existente e infraestrutura gratuita autorizada. **Saída:** recibo de restauração em Supabase descartável separado.

- [ ] Tentar a criação gratuita em outro momento, sem repetir em loop e sem upgrade; não há previsão de capacidade nem monitor automático ativo.
- [ ] Após obter um ambiente compatível, restaurar backup em destino separado, nunca no banco operacional.
- [ ] Conferir tabelas, políticas, permissões, autenticação e integridade contra o recibo; executar leitura/escrita sintética e remover apenas dados de teste conhecidos.
- [ ] Registrar resultado e processo reproduzível sem credenciais.

**Aceite:** restauração real concluída e fluxo de recuperação demonstrado. Arquivo de backup legível, isoladamente, não passa este gate. Alternativa de servidor pago exige nova decisão do proprietário.

## Tarefa 3 — validar e aplicar importação atômica

**Arquivos:** supabase/migrations/20261001060000_0495_importacao_b2b_atomica.sql; scripts/verify-limpax-import-sql.mjs; tests/invariants/importacao-b2b-atomica.test.ts.

**Entrada:** recuperação aprovada na tarefa2. **Saída:** migração0495 validada, aplicada conforme autorização condicionada existente e recibo sanitizado.

- [ ] Executar verificador SQL e preflight de funções/políticas existentes.
- [ ] Executar lote fictício com ROLLBACK, incluindo repetição idempotente, falha no meio do lote e recusa entre organizações.
- [ ] Aplicar somente se preflight, recuperação e testes passarem; não editar migração já aplicada.
- [ ] Conferir permissões/postflight e executar testes de importação/exportação afetados.

**Aceite:** lote inteiro confirma ou reverte; repetição não duplica; acesso indevido recusado. Não importar a planilha real nesta tarefa.

## Tarefa 4 — instalar e expor o CRM com HTTPS

**Arquivos:** docs/releases/limpax/2a35ef53c-arm.json; docs/evidence/limpax-documentos-release-20261001.json; docs/runbooks/limpax-oracle-rollout.md.

**Entrada:** VPS criada e manifesto publicado. **Saída:** URL HTTPS temporária, serviços saudáveis e processo de atualização/rollback.

- [ ] Confirmar máquina, custo/franquia e rede existentes; SSH administrativo temporário somente IP autorizado /32.
- [ ] Copiar manifesto para fora do checkout e instalar exatamente as imagens por digest; guardar segredos fora do Git.
- [ ] Configurar app, worker, scheduler, dependências e WAHA; manter portas auxiliares internas.
- [ ] Configurar certificado público válido no endereço temporário e testar HTTPS sem ignorar avisos de segurança.
- [ ] Verificar reinício dos serviços, saúde, logs e recuperação; fechar a abertura SSH temporária ao terminar.
- [ ] Configurar atualização por release revisada: commit → CI → imagens → backup → implantação → teste → rollback se necessário. Push no GitHub não atualiza automaticamente esta VPS.

**Aceite:** URL acessível externamente, certificado válido e operação independente do PC. DNS oficial continua adiado. Vercel anterior não hospeda este novo runtime completo.

## Tarefa 5 — aceite funcional antes do uso real

**Arquivos:** app/app/documents/; app/app/imports/; app/app/companies/; app/app/team/; tests/e2e/importar-leads-planilha.spec.ts; scripts/validate-document-storage.ts.

**Entrada:** ambiente hospedado e importação aprovada. **Saída:** matriz de resultados e gateG13 aprovado somente se critérios essenciais passarem.

- [ ] Testar login/logout, retorno protegido, cadastro público bloqueado e permissões de administrador/operador com contas especificamente autorizadas.
- [ ] Configurar e testar Google e entrega/revogação de convites quando autorizados, sem reutilizar configuração do banco antigo por presunção.
- [ ] Testar cliente/empresa/pessoa/contato, vínculo, edição e persistência após recarregar.
- [ ] Importar lote fictício pelo navegador, repetir sem duplicar e exportar; comparar conteúdo e testar arquivo inválido/conflito/organização incorreta.
- [ ] Testar OCR de imagem/PDF, revisão, modelo com PNG, salvamento, reabertura e preenchimento para outro cliente no navegador autenticado.
- [ ] Parear WhatsApp hospedado; testar conversa de entrada/saída somente com destinatário autorizado. Agentes não enviam mensagens antes do aceite.
- [ ] Separar visivelmente DEMO e real; resolver arquivos de demonstração por procedimento reversível antes da liberação.

**Aceite:** nenhum erro impeditivo aberto; resultados e limitações registrados. Telas herdadas ainda não testadas não recebem status aprovado.

## Tarefa 6 — carga real controlada e início da operação

**Entrada:** staging revisado, cobertura de campos, recuperação e aceite aprovados, autorização específica de carga. **Saída:** clientes reais reconciliados e operação liberada.

- [ ] Criar backup imediatamente antes da carga e registrar estado inicial.
- [ ] Confirmar destino de cadastros/contatos/locais/histórico e relatório de conflitos; não eliminar histórico para deduplicar.
- [ ] Executar lote piloto aprovado e reconciliar contagens, vínculos e exportação.
- [ ] Executar demais lotes somente após piloto aprovado; registrar rejeições para correção, sem descartes silenciosos.
- [ ] Publicar manual de operação, suporte, backup e recuperação; aplicarG13 apenas com evidências.

**Aceite:** cada linha tem resultado rastreável; cliente e contato seguem vínculos explícitos, não equivalência automática de toda linha da planilha.

## Roadmap posterior ao primeiro uso

1. Documentos definitivos: arquivo de emissões por cliente, versões, identificação/numeração, emissores e retorno de documento assinado; PDF atual continua prévia.
2. Assinaturas: PNG visual manual já implementado; fluxo Gov.br por portal/retorno; integração DocuSign depende de conta e configuração próprias.
3. IA/OpenRouter: credencial segura, modelos escolhidos após consulta atual de disponibilidade/limites, orçamento e teste sem envio automático. Não prometer gratuidade permanente dos modelos.
4. Fiscal/notas: descoberta do processo/provedor antes de implementação; não há emissor fiscal pronto.
5. Domínio crm.limpaxdf.com.br, DNS e callbacks somente quando proprietário autorizar a mudança.
6. Crescimento: ambientes separados, monitoramento, backup recorrente verificado e eventual migração para VPS paga.

## Como medir avanço

Não atribuir porcentagem artificial. Registrar por entrega: implementado, teste sintético aprovado, teste real aprovado e disponível online. O ponto atual é código/release preparados, antes de restauração comprovada, implantação e aceite. O primeiro trabalho independente da Oracle é staging privado; o primeiro bloqueio de implantação é capacidade gratuita.
