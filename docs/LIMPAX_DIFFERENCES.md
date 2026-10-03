# O que mudou na vertical LimpaxCRM

Comparação do código com o ancestral comum `50d14bd983bf35a878876451399e8832ff8e9ee0`
de `origin/main`. Isso não é comparação com uma release futura do upstream.

| Função | Origem e estado |
| --- | --- |
| Login/frontend, contatos, funis, tarefas, agenda e IA | Herdados do Deskcomm; não desenvolvidos do zero para Limpax. |
| Empresas e pessoas | Módulo B2B herdado, habilitado na instalação separada; ajustamos o fluxo de vínculos na tela de empresa. |
| WhatsApp/WAHA | Integração herdada; verificamos QR/permissões e conexão local. Acrescentamos arquivamento recuperável no CRM de conexão órfã, sem depender do transporte nem prometer logout do aparelho. Serviço local está desligado e VPS não existe. |
| Propostas, modelos e PDFs | Herdados. O módulo geral Documentos é adicional; propostas continuam intactas. |
| Duplicados de contatos | Detecção/mesclagem herdada por telefone/e-mail; não resolve sozinha homônimos, planilha histórica ou locais de serviço. |
| Identidade | Marca LimpaxCRM, logo/cores de entrada e bootstrap do proprietário; iCBAI como responsável pelo desenvolvimento. |
| Convites | Entrada fechada por convite; proteção para convites revogáveis e configuração de administradores convidando. |
| Base de demonstração | Seed fictício repetível com empresas, pessoas, contatos, oportunidades, tarefas e agenda, com proposta de demonstração sem envio. |
| Planilhas | Prévia e mapeamento editável; exportações CSV paginadas; proteção contra fórmulas; limites de expansão XLSX. Análise XLSM por aba até10000 linhas sem executar macros; gravação XLSM bloqueada. CSV/XLSX mantêm2000 linhas por carga e não importam ainda todo o histórico real. |
| Importação atômica | RPC preparada para repetição segura e rollback por lote; migração0495 ainda não aplicada. |
| Implantação | Kit/release ARM, imagens por CI, manifesto e sondas; recuperação endurecida e backup administrativo privado. Não significa implantação final ou restauração comprovada. |
| Documentos (incremento atual) | Aba e emissor de prévias; assinatura/carimbo em PNG, posição/tamanho/página, administrador e validação no servidor. Modelos e imagens reutilizáveis em versões privadas imutáveis, com campos e busca de empresas; Storage sintético real aprovado; aceite local autenticado de busca/preenchimento/PDF verificado em02/10; aceite hospedado pendente. PDFs emitidos e numeração definitiva ainda não arquivados. |
| OCR e assinatura externa | OCR pt-BR no navegador e revisão/modelos implementados; PNG/PDF escaneado/PDF textual sintéticos passaram no Chrome, sem serviço externo. Gov.br usa portal externo com retorno manual; não anunciar API privada disponível. DocuSign não conectado. Stub PAdES herdado não certifica PDF. |

Os arquivos reais e textos extraídos ficam fora do Git. A análise da planilha
preserva o histórico, sem considerar nome repetido prova de identidade.
Não importar dados reais ou aplicar migration sem os gates correspondentes.

Incremento de 01/10: prévia B2B passa a contar colunas em todas as linhas, recusar dados sem destino e mostrar locais/histórico em seção própria de revisão. Valores/datas ambíguos são sinalizados; endereço reconhecido não pode ser mapeado como nome para contornar o bloqueio.41 testes focados, lint e tipos aprovados. Não grava serviços/locais, não foi implantado e ainda falta aceite visual hospedado. Contrato: docs/specs/limpax-historical-import-preview.md.

## Histórico — preparação adicional em02/10/2026

Lote revisado conserva cabeçalhos/células/campos, distingue auxiliar/local/serviço e valida limites sem truncar;37 testes focados aprovados. A API de confirmação continua bloqueada. Recibos/RLS/operação atômica estão somente em supabase/drafts, com prova PostgreSQL15/17 concluída em banco descartável; não anunciar armazenamento histórico operacional. A prova não substitui instalação. Detalhes em docs/HANDOFF-LIMPAX.md e docs/evidence/limpax-history-atomic-draft-20261002.json.

## Editor histórico — 02/10/2026

Revisão temporária paginada por25 linhas, busca explícita de empresas/pessoas, escolha de cliente/endereço e aceite de data/valor; revalidação de prévia sem escrita.25 testes focados aprovados; aceite visual hospedado pendente. Workflow de prova PostgreSQL em runner padrão preparado, exclusivo ao fork público e sem dados/credenciais operacionais. Não confundir sua preparação com execução aprovada.

## Gestão histórica — bloco de02/10/2026

Incrementos próprios Limpax: correção versionada/current notes, exclusão lógica administrativa,
exportação direta da pessoa sem contato e portão administrativo de limpeza de conteúdo pessoal.
Painel nas fichas de pessoa/empresa; API com validação/origem/papel/suporte e funções SQL com
locks, recibos, rollback, MFA e audit sem conteúdo. Guardas evitam restauração por cadastro,
vínculo empresarial, nova linha importada ou telefone ativo. Exportação existente PDF/JSON
inclui estado corrente. Tudo foi implementado no fork, e o SQL segue em rascunho, não instalado.
Não foi alterado o banco operacional nem liberada importação real. Prova43/43 porPG15/17 e263 contratos por job em36987396496. Governança completa aprovada: typecheck, ESLint, canais, papéis e 17.168 testes unitários aprovados de 17.171, além de1 falha esperada e2 pulados preexistentes.


Correções transversais desta bancada:132 traduções nas telas de documentos/importação/histórico,
datas seguindo o idioma, UUID válido fora de secure context e menu sem rolagem.
Documentos segue acessível pelo hub CRM e pela busca. Registrados os workflows do fork,
as chaves privadas do acervo, os portais manuais do ITI e a ausência deliberada de RPCs
históricas ainda não instaladas. Nenhum teste foi pulado para tornar o resultado verde.
