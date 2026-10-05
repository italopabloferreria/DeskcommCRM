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
- Serviço de sugestões sem configuração retorna 503 autorizado, informa a indisponibilidade e interrompe polling. Isto não configura a IA.
- 81 testes passaram em 14 arquivos de documentos, assistência, revisão, importação/exportação e preparação histórica. Cinco testes da assistência repetidos após alteração final passaram. Lint direcionado aprovado.
- Código enviado à branch `vertical/limpax`, commit `88fbde5ec`, incluindo os commits locais anteriores.

## Ainda não comprovado

1. **Identidades históricas:** 868 linhas das outras abas examinadas; 14 correspondências somente por endereço, zero vínculos inequívocos pelo cruzamento efetuado. Responsável/equipe e nome da aba não são prova de cliente. Necessária decisão comercial para cliente/local; não excluir, mesclar ou atribuir atendimentos por suposição.
2. **Restauração nova:** dump após a importação criado em 04/10; ainda não restaurado em ambiente separado. A restauração validada antes da importação não valida automaticamente este snapshot. Na máquina, Docker está parado e aproximadamente 6 GB livres ao fim; não iniciar serviços sem prever consumo e desligamento depois do teste.
3. **PNG pela interface:** extensão Chrome recusou upload local por permissão de arquivos. Não foi alterada a permissão. Validação do PNG e renderização são cobertas pelos testes, não por este aceite de UI.
4. **Download pela interface:** espera do navegador expirou e o controle perdeu a conexão. Download/integridade pelo Storage comprovados; download do operador ainda exige reteste.
5. **Aceite geral:** cadastro/edição/busca e perfis precisam da bancada completa de usuário. Testes focados não equivalem a esse aceite. Build e tipos integral não foram repetidos devido ao consumo de RAM já registrado.
6. **Desempenho:** eliminada consulta periódica de serviço ausente; otimização geral ainda não comprovada. Modo desenvolvimento compila sob demanda.

## Dependências de hospedagem e roadmap

VPS gratuita, instalação, HTTPS e WhatsApp hospedado permanecem pendentes. DocuSign e domínio definitivo são etapas posteriores. Não é necessário criar registros reais fictícios nem remover dados existentes para terminar os testes.
