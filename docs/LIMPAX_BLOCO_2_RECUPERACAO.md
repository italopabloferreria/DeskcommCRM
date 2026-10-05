# Bloco 2 — recuperação e distribuição

Concluído em 05/10/2026. Recuperação comprovada com banco, Auth, Storage e aplicação ARM publicada. MVP funcional para apresentação local acompanhada; produção/G13 continuam abertos.

## Limpeza autorizada

Removidos, em uma transação na organização Limpax: conexão pessoal, 27 mensagens, três conversas, 101 registros de webhook e 56 eventos associados. Uma tentativa vazia foi arquivada. Antes/depois: 4.066 contatos, dos quais 4.050 importados. Restam zero mensagens, conversas ou conexões ativas. Auditoria registra contagens, sem conteúdo pessoal. Nenhuma mensagem enviada.

Backups históricos anteriores podem conter o teste pessoal. Foram preservados como cópias privadas; não são o snapshot limpo de instalação. A limpeza não apagou contatos nem alterou a planilha original.

## Recuperação comprovada

- Backup novo, posterior à limpeza: arquivo legível, SHA256 conferido e restauração executada em banco PostgreSQL 17 isolado.
- 222 tabelas, 632 políticas RLS, 479 funções e 24 ACLs padrão conferidas. Permissões equivalentes após restaurar ACL de vault; diferença textual de um CHECK validada por estrutura lógica e 900 combinações.
- Reconciliação integral: 4.050 contatos importados, 5.050 linhas de origem e 11 lotes, sem ausências nem alterações.
- Auth recuperado: conta administrativa existente autenticou na cópia. Senha rotacionada somente na cópia isolada; credenciais do Supabase operacional intactas.
- Quatro vínculos de roles de serviço capturados da origem e restaurados localmente. Dump de banco não inclui todos os vínculos globais de roles.
- Storage privado: seis objetos recuperados e comparados por SHA256, incluindo quatro PDFs. Download anônimo negado; documentos continuam acessíveis apenas pelas rotas autorizadas do CRM.
- Chrome: login real na aplicação restaurada, listagem “Exibindo 25 de 4066 contatos”, quatro PDFs arquivados e download autenticado. PDF baixado idêntico ao backup, com marcador do cliente fictício confirmado. Tela de conexões mostra nenhuma conexão cadastrada.

Recibos, banco, arquivos, chaves, capturas e credenciais ficam fora do Git. Publica-se somente evidência agregada, sem dados de clientes.

## Compatibilidade da bancada

Banco supabase/postgres:17.6.1.136, Auth v2.196.0, PostgREST v16.2, Storage v1.79.31 e Kong 2.8.1. Storage v1.72.1 não suporta o esquema versionado recuperado: upload falhou com SQL 42P10. Versão compatível resolveu o erro sem alterar políticas ou índices do banco operacional. Fixar versões compatíveis na recuperação; não corrigir incompatibilidade enfraquecendo RLS.

Aplicação publicada ARM64 executada sob emulação no computador Windows. Esse teste comprova funcionamento, não desempenho da VPS ARM. Portas da bancada limitadas a loopback; nenhum WAHA, worker, scheduler ou envio de email iniciado. Next de desenvolvimento em 3000 preservado. Bancada temporária encerrada após testes.

## Distribuição

Revisão 827d57d427b59a313ea0c807d79fa44b5c02e8d0: [CI aprovada](https://github.com/italopabloferreria/DeskcommCRM/actions/runs/37271284402). Três imagens próprias publicadas por digest, acesso anônimo conferido. Manifesto docs/releases/limpax/827d57d42-arm.json validado; aplicação instalada da imagem correspondente, arquitetura e label de revisão conferidos. Substitui 59713f3fb como candidato de instalação atual. Não houve deploy público.

## O que falta

Próximo bloco: instalar candidato fixado em hospedagem disponível, validar HTTPS/login/permissões e conectar número empresarial autorizado antes de fechar G13. Oracle gratuita continua dependente de capacidade; não foi feita nova tentativa neste bloco nem autorizada cobrança.

Base: 212 grupos candidatos e históricos sem identidade inequívoca continuam sujeitos a revisão; não foram mesclados. Roadmap: DocuSign, retorno de arquivos assinados pelo Gov.br, IA configurada, domínio crm.limpaxdf.com.br e descoberta fiscal.
