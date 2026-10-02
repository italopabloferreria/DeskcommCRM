# Tratamento documental e emissor — plano de implementação

**Goal:** preservar o acervo histórico e preparar documentos com assinatura visual sem confundir prévia com emissão definitiva.
**Architecture:** especialização da vertical, com funções puras de revisão; OCR de contratos pelo módulo Documentos; emissor de prévias autenticado sem gravação. Persistência e assinatura externa são incrementos próprios, sem dependência do núcleo.
**Tech Stack:** TypeScript, Zod, React PDF, Next; motor OCR português a integrar ao fluxo de modelos e Supabase privado no incremento persistente.
**Spec:** ../specs/2026-10-01-documentos-limpax-design.md

Execução sequencial pelo agente atual, respeitando o pedido de avançar sem novas consultas.

## 1. Revisão de identidade sem perda de histórico

- [x] Testar homônimos, telefone compartilhado, IDs repetidos, fonte repetida e ausência de transitividade.
- [x] Criar `lib/documentos/revisao-cadastros.ts` e teste co-localizado: candidatos com evidência, nenhuma fusão.
- [ ] Aplicar análise à extração privada da planilha, preservar linhas e registrar apenas contagens públicas.

## 2. OCR de contratos dentro do CRM — código implementado

- [x] Upload de contrato/PDF escaneado pela tela, extração pt-BR limitada por página e revisão.
- [x] Transformar extração em modelo reutilizável com variáveis de cliente e diagramação revisada.
- [ ] Preservar original/hash e distinguir OCR candidato de conteúdo confirmado; não usar OCR para cadastrar clientes.
- [ ] Piloto Windows ficou privado fora do repositório e NÃO é funcionalidade do CRM.

## 3. Prévia funcional pela aba Documentos

- [x] Criar schema/limites e testes em `lib/documentos/previa.ts`.
- [x] Renderizador PDF e rota `app/api/v1/documents/preview/route.ts`: RBAC, origem, limite, respostas privadas; testes de autorização/validação e PDF.
- [x] Criar `app/app/documents/` com formulário, PNG, posição por página e download; registrar navegação.
- [x] Testes focados, lint dos arquivos, diff; não ligar Docker/Next ou fazer build pesado.

## 4. Arquivo persistente e modelos (após prévia)

- [ ] Modelagem do módulo opcional: provisionador, versão imutável, vínculo FK, RLS/Storage, auditoria, idempotência e política LGPD.
- [ ] Administrador cadastra emissor, PNG privado e permissões de uso; edição de modelo com posições por página.
- [ ] Revisão OCR documental no CRM; planilha em staging separado com revisão de duplicados e cadastro/local/histórico distintos.
- [ ] Backup restaurado e provas sintéticas antes de qualquer migração ou importação real.

## 5. Provedores externos e fiscal

- [ ] Gov.br: exportação/importação preservando bytes e verificação ITI; elegibilidade para API pesquisada.
- [ ] DocuSign: sandbox OAuth/envelope/webhook com dados sintéticos, sem envio real antes de autorização.
- [ ] Guardar notas existentes; descobrir integração NFS-e antes de implementar emissão fiscal.

## Entrega

- [x] Documentar diferenças comprovadas contra merge-base `50d14bd983bf35a878876451399e8832ff8e9ee0`.
- [x] Atualizar handoff e estado nos dois repositórios; commit apenas mudanças desta etapa.

## Incremento executado — OCR e persistência

Implementado no fork: OCR em português dentro de /app/documents para PDF escaneado/PNG/JPEG, leitura direta de PDF com texto, revisão explícita e campos de cliente. Até 20 páginas de origem/10 MB, divididas sem truncar em até 40 páginas do editor. Busca de empresa cadastrada preenche nome/documento/telefone/endereço. Modelos, assinatura e carimbo são salvos juntos como versões JSON imutáveis no bucket privado documentos-privados, com hash e acesso pelo servidor/admin/organização. Replay não sobrescreve; auditoria registra a versão sem o conteúdo. Não cria tabelas ou modifica o módulo de propostas.

Provas: 234 testes relevantes aprovados (232 na suíte de sete arquivos, mais provisionamento privado e imagens duplicadas); navegador real com PNG fictício, PDF escaneado e PDF textual aprovados, confiança 95% na imagem, zero requisições externas. Lint e tipos focados aprovados. Assets OCR/idioma/PDF são copiados das dependências fixadas antes de dev/build; não dependem de CDN. Nenhum Next/Docker/build completo, importação real ou alteração remota executados.

Limites: extração não conserva automaticamente a diagramação original; revisão é obrigatória. Original fica com o usuário; só seu hash e texto do modelo revisado são salvos. Acervo paginado em 25 versões por consulta, sem truncamento silencioso. Persistência foi validada com Storage simulado; bucket/permissões e round-trip no Supabase real precisam de aceite antes de uso. PDF ainda é prévia, sem arquivo de emissões/numeração/valor fiscal. DocuSign não conectado; Gov.br usa portal externo.

Próximo executável: aceite autenticado do fluxo de modelos/PNGs no Storage real e publicação da revisão quando houver ambiente disponível; depois arquivo de emissões e retorno de documentos assinados. Backup/restauração/0495/VPS/G13 mantêm os gates existentes.
