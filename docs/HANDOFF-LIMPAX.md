# Retomada da vertical LimpaxCRM

## Entrega atual: OCR, modelos e imagens reutilizáveis

Implementado no fork: OCR em português dentro de /app/documents para PDF escaneado/PNG/JPEG, leitura direta de PDF com texto, revisão explícita e campos de cliente. Até 20 páginas de origem/10 MB, divididas sem truncar em até 40 páginas do editor. Busca de empresa cadastrada preenche nome/documento/telefone/endereço. Modelos, assinatura e carimbo são salvos juntos como versões JSON imutáveis no bucket privado documentos-privados, com hash e acesso pelo servidor/admin/organização. Replay não sobrescreve; auditoria registra a versão sem o conteúdo. Não cria tabelas ou modifica o módulo de propostas.

Provas: 234 testes relevantes aprovados (232 na suíte de sete arquivos, mais provisionamento privado e imagens duplicadas); navegador real com PNG fictício, PDF escaneado e PDF textual aprovados, confiança 95% na imagem, zero requisições externas. Lint e tipos focados aprovados. Assets OCR/idioma/PDF são copiados das dependências fixadas antes de dev/build; não dependem de CDN. Nenhum Next/Docker/build completo, importação real ou alteração remota executados.

Limites: extração não conserva automaticamente a diagramação original; revisão é obrigatória. Original fica com o usuário; só seu hash e texto do modelo revisado são salvos. Acervo paginado em 25 versões por consulta, sem truncamento silencioso. Persistência foi validada com Storage simulado; bucket/permissões e round-trip no Supabase real precisam de aceite antes de uso. PDF ainda é prévia, sem arquivo de emissões/numeração/valor fiscal. DocuSign não conectado; Gov.br usa portal externo.

Próximo executável: aceite autenticado do fluxo de modelos/PNGs no Storage real e publicação da revisão quando houver ambiente disponível; depois arquivo de emissões e retorno de documentos assinados. Backup/restauração/0495/VPS/G13 mantêm os gates existentes.

## Descoberta documental concluída — 01/10/2026

O proprietário autorizou ler a pasta Documentos. Análise sanitizada: docs/LIMPAX_DATA_DISCOVERY.md no repositório Limpax. 346 arquivos; planilha XLSM com9 abas,4.148 linhas com nome na aba CADASTRO, que mistura cadastros e histórico. 1.751 nomes normalizados NÃO equivalem a clientes únicos;79 repetições excedentes de ID.326 PDFs/595 páginas abertos,10 sem texto;ZIPs inventariados e10 PDFs internos lidos,cinco com texto. Imagens/OCR e Word antigo permanecem leitura complementar. Não executar macros/atalhos. Originais intactos;Documentos ignorado no Git;extrações com PII privadas fora dos repos.

Importador atual aceita CSV/XLSX, primeira aba e até2.000 linhas; oito campos mapeáveis não incluem endereço/data/valor/observação de serviço. Próximo de dados: preparar staging privado e plano explícito de cadastro/contato/local/histórico sem perdas e sem importação remota. Backup real existe,restauração isolada/0495/aceite ainda pendentes;VPS gratuita sem capacidade;G13 aberto. Não criar módulos futuros ou transformar condições de contratos históricos em SLA/preço/licença atual.

## Estado verificado em 01/10/2026

- CRM ativo: C:\Users\italo\Programação\01_PROJETOS\DeskcommCRM, branch vertical/limpax. O repositório Limpax conserva o site público e o histórico; não expandir o CRM antigo.
- Banco isolado: Supabase bzretxzwnudtpxmoqjyv. A migração 20261001060000_0495_importacao_b2b_atomica.sql está preparada e NÃO aplicada. Nenhuma planilha real importada nesta etapa.
- Publicação ARM aprovada na revisão 68fe7e0de76a7c7213f247a28a213f27c7297697: 271 testes, lint, Compose real, suite shell e cinco sondas. Manifesto docs/releases/limpax/68fe7e0de-arm.json no fork; três imagens publicadas. Isso não comprova os fluxos com banco e WhatsApp reais.
- Rede Oracle exclusiva criada: limpaxcrm-vcn, limpaxcrm-publica, limpaxcrm-igw, rota e portas web 80/443. SSH fechado. Nova tentativa A1 2 OCPUs/12 GB/Ubuntu24.04 ARM/80 GB retornou capacidade insuficiente no AD-1 de São Paulo. Nenhuma VPS, IP ou HTTPS criado.
- Docker, Next e builds pesados locais permanecem OFF; volumes preservados. Recursos pagos proibidos. DNS oficial adiado; futuro endereço crm.limpaxdf.com.br. G13 aberto.

## Ordem de execução e condições

1. Credencial administrativa identificada no arquivo autorizado pelo proprietário e conexão postgres validada com certificado CA oficial e validação de hostname. Não expor senhas nem modificar o arquivo original. Ferramentas PostgreSQL17 portáteis obtidas da EDB; nenhum Docker/servidor iniciado.
2. Backup administrativo privado concluído em 01/10/2026: pg_dump17.11, arquivo custom de 2.614.004 bytes, checksum e decodificação integral aprovados; 186 tabelas public, 27 auth e 8 storage, 632 políticas e 844 ACL no arquivo. Papéis exportados sem senhas; Storage tem zero objetos. Recibo sanitizado no fork: docs/evidence/limpax-backup-20261001.json. Ainda falta restaurar em instalação Supabase descartável separada e verificar recuperação/login; o arquivo legível NÃO equivale a restauração comprovada.
3. Só após backup/restauração aprovados, executar preflight e teste sintético com ROLLBACK da0495; aplicar a migração somente se as provas passarem, conforme autorização já recebida.
4. Quando houver capacidade gratuita, concluir a VPS com a rede/chave públicas existentes, SSH temporário somente IP atual /32 e fechar após instalação. Rascunho Chrome3/920935687 preservado na última sessão; validar existência da aba antes de reutilizar. Não repetir criação em loop.
5. Seguir docs/runbooks/limpax-oracle-rollout.md do fork: copiar o manifesto para fora do checkout antes de fixar a revisão exata das imagens. Instalar serviços, validar HTTPS e aceitar login, importação/exportação, isolamento e WhatsApp no ambiente hospedado.

## Limites da autorização

Backup, preflight e teste sintético estão autorizados; aplicação0495 condicionada às provas. Não importar dados reais, convidar usuários, enviar mensagens, cobrar recursos ou alterar DNS nesta etapa. Não repetir testes/builds aprovados sem mudança ou falha nova. Não declarar produção enquanto G13 estiver aberto.

## Implementação disponível

Identidade LimpaxCRM/iCBAI, login/frontend padrão da base Deskcomm, módulos B2B/contatos/leads/tarefas/agenda e dados DEMO já instalados. Importação com mapeamento/prévia/confirmação e exports CSV implementados; aceite real e RPC0495 permanecem pendentes. Papéis administrativos controlam convites. OpenRouter e modelos gratuitos dependem da configuração/credencial e do aceite do fluxo de agentes; não ativar envio real nesta tarefa.

## Histórico preservado

As notas antigas não são instruções atuais: [HANDOFF-LIMPAX-before-consolidation-20261001.md](history/HANDOFF-LIMPAX-before-consolidation-20261001.md).
