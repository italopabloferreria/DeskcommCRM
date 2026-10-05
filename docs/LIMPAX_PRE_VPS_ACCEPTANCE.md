# Limpax — aceite antes da VPS

Verificação de 04/10/2026. G13 permanece aberto. Não representa autorização de produção.

## Comprovado

- Local 3000 responde; mantida uma única instância Next, sem Docker/WAHA.
- Auditoria: 4.050 contatos importados esperados encontrados, 4.065 contatos totais, 5.050 linhas físicas preservadas e 11 lotes completos.
- Lista distingue tamanho da página e total. Paginação autenticada: 25/4.065 → 50/4.065.
- Revisão dentro do CRM: 4.050 contatos examinados, 212 grupos candidatos por nome/endereço/telefone original. Nenhuma união automática.
- Salvamento autenticado de PDF fictício no arquivo privado e listagem na interface.
- Recuperação do objeto no Storage e conferência do cabeçalho PDF/SHA-256. Bucket privado.
- Backup atual do banco criado, catálogo legível; cópia dos documentos privados com hashes. Artefatos e clientes reais fora do Git.
- Snapshot após a importação restaurado em banco isolado: 222 tabelas, 632 políticas, 479 funções e 24 conjuntos de permissões padrão conferidos. Os 4.050 contatos e 5.050 registros de origem coincidem com o plano privado; 11 lotes recuperados. A diferença de proprietário/permissões do schema vault foi corrigida somente na cópia isolada. Uma diferença de parênteses de CHECK tem árvore equivalente e passou em 900 combinações. Não comprova login Auth no ambiente restaurado.
- Navegador interno autenticado: upload de PNG transparente sintético de assinatura e carimbo, modelo salvo e reaberto com texto/imagens/posições. Nenhuma assinatura real do titular foi usada.
- PDF com PNG arquivado e baixado pela interface; SHA-256 do download coincide com o objeto privado. Backup Storage atualizado ao final: cinco objetos, três PDFs íntegros, incluindo os modelos e documentos de teste.
- Exportação real de contatos pelo navegador: CSV com 4.065 registros, incluindo todos os 4.050 IDs importados. Arquivo com dados pessoais fora do Git.
- OCR real na interface com imagem de contrato fictício: texto das quatro linhas reconhecido, revisão obrigatória, modelo salvo com campo de cliente, PDF preenchido arquivado/baixado. Texto extraído do PDF confirma o cliente fictício e ausência da variável não preenchida. Este teste de imagem limpa não mede qualidade em todo o acervo real.
- Serviço de sugestões sem configuração retorna 503 autorizado, informa a indisponibilidade e interrompe polling. Isto não configura a IA.
- 81 testes passaram em 14 arquivos de documentos, assistência, revisão, importação/exportação e preparação histórica. Cinco testes da assistência repetidos após alteração final passaram. Lint direcionado aprovado.
- Código enviado à branch `vertical/limpax`, commit `88fbde5ec`, incluindo os commits locais anteriores.

## Ainda não comprovado

1. **Identidades históricas:** 868 linhas das outras abas examinadas; 14 correspondências somente por endereço, zero vínculos inequívocos pelo cruzamento efetuado. Responsável/equipe e nome da aba não são prova de cliente. Necessária decisão comercial para cliente/local; não excluir, mesclar ou atribuir atendimentos por suposição.
2. **Recuperação de aplicação:** restauração do banco passou, mas login Auth e subida da aplicação usando a cópia isolada não foram exercitados. Snapshot restaurado antecede os novos modelos de teste; objetos Storage têm backup separado.
3. **Aceite geral:** cadastro/edição/busca e perfis precisam da bancada completa de usuário. Testes focados não equivalem a esse aceite. Build e tipos integral não foram repetidos devido ao consumo de RAM já registrado.
4. **Desempenho:** eliminada consulta periódica de serviço ausente; otimização geral ainda não comprovada. Modo desenvolvimento compila sob demanda.
5. **Prévia direta:** a espera de download por blob da prévia expirou no navegador interno; não afirmar que esse controle passou. O fluxo Salvar PDF no CRM → Baixar PDF arquivado passou, inclusive com preenchimento do modelo OCR.

Docker foi iniciado exclusivamente para recuperação, com PostgreSQL isolado em loopback e limite de 768 MB; desligado novamente ao terminar. A inicialização automática de contêineres de outro projeto reduziu a RAM livre; não manter essa bancada ligada. Next 3000 permaneceu disponível. As limitações anteriores de upload/download no Chrome foram superadas pelo navegador interno existente, sem alterar permissões da extensão.

## Dependências de hospedagem e roadmap

VPS gratuita, instalação, HTTPS e WhatsApp hospedado permanecem pendentes. DocuSign e domínio definitivo são etapas posteriores. Não é necessário criar registros reais fictícios nem remover dados existentes para terminar os testes.

## Verificação de release — 04/10/2026
GitHub: verificação ARM do commit88fbde5ec passou; publicação37253362489 parou em Conferir lint e fragmento. Reprodução local encontrou seis fragmentos .changes malformados (impacto corretivo fora do enum ou ausência de frontmatter). Corrigido somente formato/classificação e removidos headings inválidos; conferência release passou com33fragmentos. Workflow passa a disparar para .changes/**. Lint exato da etapa passou. Testes direcionados da publicação/versionamento em andamento; não afirmar publicação nova concluída atéCIconfirmar.
