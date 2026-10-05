# Bloco 1 — aceite local, 05/10/2026

## Veredito

**Bloco 1 concluído para apresentação local acompanhada. Temos um MVP funcional de contatos e documentos para apresentar ao cliente.** Prévia direta e leitura de PDFs reais foram conferidas; quatro perfis autenticaram com isolamento entre organizações e foram exercitados nas telas descritas no fechamento abaixo. OCR exige revisão humana e não reproduz o layout original. Produção/G13 permanecem abertos.

## Execução e resultado

- Local estava desligado. Iniciada uma única instância Next deste fork em localhost:3000; login HTTP 200. Docker/WAHA não iniciados.
- 115 testes em 13 arquivos passaram: contratos de contatos/paginação, schemas, importação/exportação, interfaces de importação/documentos, rotas de modelos/arquivo/prévia e guards RBAC/MFA.
- 51 testes em oito arquivos passaram: busca/ordenação, conflito de duplicidade, auditoria antes/depois da edição, login, arquivo de documentos e assistência sem configuração.
- Typecheck integral encontrou três acessos possivelmente indefinidos em `tests/unit/draft-reply-unconfigured.test.ts`. Corrigido com guarda explícita que falha se a rota não devolver resposta; mesmas assertions 503/403, isolamento e ausência de consulta ao pool preservadas. Repetição integral do typecheck: exit 0.
- Lint do teste alterado e `git diff --check`: exit 0.
- Probes HTTP sem sessão das rotas contacts, imports, documents/models e documents/archive: todas 401. Isso prova negação anônima, não matriz completa com usuários reais.
- Navegador: ferramenta rejeitou seleção da aba existente por política de URL/protocolo. Proibiu contorno por outra superfície; nenhuma alternativa de navegador foi usada. Aceite visual novo bloqueado nesta sessão.

## Matriz de evidência

| Fluxo | Evidência disponível | Falta para concluir bloco |
|---|---|---|
| Cadastro/edição | Schemas, conflito, auditoria e criação/edição de fixture em sessão real passaram; edição persistiu após recarga | Concluído no escopo de apresentação |
| Busca/paginação | Busca real encontrou fixture, abriu ficha; paginação real já comprovada em 04/10 | Concluído no escopo de apresentação |
| Importar/exportar | Testes passaram; importação 4050 e exportação CSV 4065 previamente conferidas | Não reimportar base real apenas para repetir teste |
| Documentos | Testes passaram; PDF vinculado ao novo contato, preenchido, arquivado e baixado em 05/10; OCR/modelo/PNG anteriores comprovados | Concluído; revisar OCR antes de usar |
| Perfis | Guard por papel/organização/MFA passou; endpoints negam anônimo | Concluído em tenants técnicos; ver escopo abaixo |

## Critério de anúncio

Anunciar explicitamente “MVP funcional para apresentação local” quando cadastro/edição/busca, navegação e geração de documento funcionarem na sessão real e não houver bloqueador dos fluxos demonstrados. Delimitar WhatsApp, IA e históricos ambíguos, sem apresentá-los como operacionais. “Pronto para uso em produção” exige hospedagem, HTTPS, atendimento e G13; não é consequência deste bloco.

### Continuação do bloco 1 — 05/10/2026
Acrescentada matriz explícita das16combinações viewer/agent/manager/admin em lib/auth/require-role.test.ts. Sessão declara admin enquanto papel efetivo vem do banco: teste verifica que downgrade não ganha privilégios antigos. Suíte25/25 passou, lint/diffcheck passaram. São16casos novos além dos166anteriores; não somar repetição dos9existentes. Matriz usa mocks, não prova sessões reais/RLS. Local3000HTTP200. Inventário confirmou aba interna ainda em data: página de erro; seleção não repetida nem contornada. MVP de apresentação ainda não aprovado; cadastro/edição/busca visual eperfis reais pendentes.

## Aceite visual restabelecido — 05/10/2026
MVP funcional para apresentação local acompanhada de contatos/documentos comprovado na sessão atual. Contato fictício sem telefone criado, encontrado na busca, editado e reaberto após recarga com persistência. PDF vinculado ao fixture arquivado/baixado; texto confirma cliente preenchido sem variável pendente. Uma fixture claramente marcada NÃO UTILIZAR foi preservada (total passa4065→4066; importados continuam4050). Nenhum cliente real alterado ou mensagem enviada. Evidências visuais/PDF foraGit emlimpax-private/Downloads.
Encontrado/corrigido no editor: campo cliente preenche destinatário vazio sem substituir texto manual; erro de Zod ao arquivar mostra mensagem clara.17testes/4arquivos passaram; após nova regressão,9testes/2arquivos passaram; lint/typecheck integral/diffcheck/conferência36fragmentos passaram. Não somar suítes repetidas. Alterações locais ainda não são as imagens ARM publicadas59713f3fb.
Bloco1não totalmente fechado: quatro perfis em sessões reais ainda não exercitados; testes unitários cobrem16combinações; prévia direta porblob novamente não capturada, enquanto download do arquivo persistido passou; qualidade OCR do acervo real pendente. Bloqueio anterior do navegador resolvido pelo titular. G13aberto; sem produção/VPS/HTTPS/WhatsApp. Próximo: bancada isolada porperfil e recuperação de aplicação; roadmapassinaturas eletrônicas/IA/domínio.


## Fechamento do bloco 1 — 05/10/2026
**Bloco 1 concluído para apresentação local acompanhada de contatos e documentos. MVP funcional para apresentar ao cliente. Produção/G13 não liberados.**
Prévia direta: implementado download nativo por formulário POST na mesma rota autenticada, mantendo Origin, papel agent, papel admin para PNG, schema estrito e limite real de 1 MB. O navegador interno baixou documento-previa.pdf; conteúdo e renderização visual conferidos. Link antigo por blob não concluía no navegador interno. Prévia pronta fica disponível somente enquanto o conteúdo corresponde ao documento atual; recursos temporários são liberados.
Acervo real: inventariados 326 PDFs sem alterar originais. Proposta com duas páginas de origem gerou três páginas no editor; comparação do texto normalizado com extração independente foi idêntica, sem avaliar reprodução do layout original. Termo escaneado gerou duas páginas de texto, reconheceu seis trechos impressos de referência e mostrou baixa confiança na página de origem. Manuscritos e dados críticos exigem revisão humana. Nenhum conteúdo real foi salvo como modelo ou emitido; extrações privadas permanecem foraGit. É leitura assistida e reconstrução em modelo editável, não cópia fiel de tabelas ou assinaturas do original.
Perfis: quatro usuários sintéticos em duas organizações técnicas separadas no Supabase atual, não num novo banco. Auth real e RLS: cada papel viu exatamente o contato do seu tenant e zero do outro. Chrome externo com sessão separada preservou a sessão do titular no navegador interno. Leitor: leitura de contatos, POST de cadastro negado403, documentos redirecionam ao inbox. Atendente: documentos sem PNG/arquivo, PDF baixado. Gestor: documentos sem PNG/arquivo. Admin: modelos/PNG/arquivo disponíveis. As16combinações unitárias continuam complementares; não alegar teste visual de todas as operações possíveis. O botão de cadastro ainda é oferecido ao leitor, mas o servidor nega a gravação; melhoria de orientação visual não impede a demonstração administrativa. Ao final, quatro memberships revogadas e quatro usuários bloqueados, senhas removidas do recibo; nenhuma permissão de usuário Limpax alterada, nenhuma mensagem enviada.
Verificação final:23testes em5arquivos passaram, typecheck integral e lint direcionado passaram. Não somar novamente testes repetidos às contagens anteriores. Alterações locais ainda não estão nas imagens ARM publicadas59713f3fb.
Próximo bloco executável: recuperação da aplicação com login e documento em cópia isolada; atualizar backup de Storage para incluir PDFs técnicos emitidos após o snapshot anterior. Bloqueios externos:VPS gratuita,HTTPS eWhatsApp hospedado. Históricos com identidade ambígua dependem de vínculo comercial inequívoco. Roadmap:DocuSign, retorno manual Gov.br,IA configurada ecrm.limpaxdf.com.br.
