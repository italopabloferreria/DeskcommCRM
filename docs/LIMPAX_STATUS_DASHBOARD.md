# LimpaxCRM — dashboard de acompanhamento

Atualizado em 05/10/2026. Blocos 1 e 2 concluídos: MVP funcional para apresentação local acompanhada, recuperação integral exercitada. Fotografia das evidências; sem atualização automática. Produção não liberada: G13 aberto.

## Concluído e comprovado

- Base: 4.050 contatos importados, 4.066 totais, incluindo uma fixture marcada NÃO UTILIZAR; 5.050 linhas de origem, nove abas e 11 lotes preservados. Exportação real CSV inclui todos os importados. Paginação de 25 registros não representa o total.
- Histórico da aba CADASTRO no contato; tela de revisão de identidades com 212 grupos candidatos, sem união automática.
- Documentos: OCR de contrato fictício na interface, revisão, modelo reutilizável, preenchimento de cliente e PDF privado arquivado/baixado com integridade verificada.
- Upload manual de PNG de assinatura e carimbo; posições e modelos persistidos. Testes usaram imagens sintéticas, não assinatura real.
- Conexão pessoal e histórico de teste removidos: 27 mensagens e três conversas; contatos preservados. Zero conexões ativas, conversas e mensagens restantes.
- Backup limpo restaurado em cópia isolada: 222 tabelas, 632 políticas e base esperada conferidos. Auth e aplicação autenticados; seis objetos privados e quatro PDFs recuperados. Download no CRM restaurado idêntico ao backup.
- Imagens ARM de aplicação, worker e scheduler atualizadas; builds e sondas passaram. [CI aprovada](https://github.com/italopabloferreria/DeskcommCRM/actions/runs/37271284402), revisão `827d57d42`. Manifesto: `docs/releases/limpax/827d57d42-arm.json`. Acesso anônimo às três imagens confirmado; aplicação instalada/testada da imagem.
- Local 3000 disponível; bancada de recuperação encerrada. Nenhum WAHA/worker/scheduler Limpax ativo. IA ausente tratada com indisponibilidade, sem polling repetido.

## Próximo bloco executável

Bloco 3: instalar em hospedagem disponível com manifesto fixado; validar HTTPS/login/permissões, desempenho no destino e WhatsApp empresarial autorizado. Capacidade gratuita Oracle continua externa e sem prazo confirmado. Manter custo zero.

O bloco 1 comprovou cadastro/edição/busca, quatro perfis em sessões reais, isolamento entre organizações, download direto e leitura dos dois tipos de PDF. O bloco 2 comprovou recuperação com login e PDF na aplicação. Evidências e limites: `LIMPAX_BLOCO_1_ACEITE.md` e `LIMPAX_BLOCO_2_RECUPERACAO.md`. Emulação ARM no computador não mede desempenho da VPS.

## Decisões e dependências

- 212 grupos de identidades exigem revisão antes de mesclar.
- 132 linhas CADASTRO sem contato; 868 linhas das outras abas preservadas e examinadas. Há 14 candidatos apenas por endereço, zero vínculos inequívocos confirmados. Definir cliente/local explicitamente antes de associar atendimentos.
- Upload das assinaturas/carimbos reais pelo titular. PNG é assinatura visual, sem certificação eletrônica automática.
- Oracle gratuita sem disponibilidade confirmada/prazo garantido; manter custo zero. Depois instalar, validar HTTPS/Auth, WhatsApp autorizado e fechar G13.
- Planilha importada não sincroniza futuras alterações do Excel automaticamente.

## Roadmap

DocuSign; retorno de arquivos assinados no Gov.br (sem integração automática implementada); IA configurada; domínio futuro `crm.limpaxdf.com.br`; emissão fiscal não implementada.

## Caminho de lançamento

Aceite local + recuperação de aplicação → revisão de base/históricos → hospedagem gratuita → instalação com manifesto fixado → HTTPS/Auth/permissões → WhatsApp autorizado → G13 → uso acompanhado.

Fontes: `LIMPAX_PRE_VPS_ACCEPTANCE.md`, `LIMPAX_OPERACAO_INICIAL.md`, `HANDOFF-LIMPAX.md` e runbook Oracle. O dashboard não substitui os gates nem representa publicação do CRM.

## Bloco 1 — 05/10/2026
Local desligado foi iniciado em uma única instância Next deste fork; login HTTP200. 166 testes em21 arquivos passaram (115+51); typecheck integral passou após guarda explícita em testes/unit/draft-reply-unconfigured.test.ts, sem remover assertions. Lint direcionado/diffcheck passaram. Quatro endpoints negam anônimo com401. Aceite visual novo bloqueado pela política da ferramenta ao selecionar aba existente; não contornar por outro navegador/superfície. MVP de apresentação ainda não declarado aprovado; G13 aberto. Matriz/evidência: DeskcommCRM/docs/LIMPAX_BLOCO_1_ACEITE.md. Próximo: cadastro/edição/busca e perfis em sessão real quando acesso normal da ferramenta for restabelecido; manter local3000. VPS custo zero/HTTPS/WhatsApp externos; DocuSign/Gov.br/IA/domínio roadmap.

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
## Bloco 3 iniciado — 05/10/2026
Blocos 1 e 2 concluídos; MVP funcional para apresentação local acompanhada. Roteiro Oracle atualizado para revisão827d57d42 e manifesto imutável; CI37271284402 aprovada. Guardas de instalação/publicação:37 testes Vitest aprovados. Metadados oficiais confirmam ARM64 de WAHA, Redis, ponte Redis HTTP e Caddy, sem baixar camadas ou iniciar serviços. Tentativa inicial com runner Node inadequado falhou antes dos testes; execução correta Vitest passou. CRM local3000 mantido.
Sessão Oracle expirou; aba Chrome entregue ao titular para login. Capacidade ainda não reconsultada nesta etapa. Nenhuma VPS criada, SSH liberado, instalação aplicada ou HTTPS público validado. Custo zero obrigatório. Próximo: autenticar no console, conferir cota/rede/capacidade, instalar manifesto fixado, validar HTTPS/login/perfis/PDFs/desempenho e parear WhatsApp empresarial autorizado. G13 aberto. Roadmap: DocuSign, retorno manual Gov.br, IA e domínio crm.limpaxdf.com.br.
