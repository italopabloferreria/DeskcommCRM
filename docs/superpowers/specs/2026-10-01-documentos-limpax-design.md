# Documentos, tratamento de acervo e assinaturas

Pedido do proprietário em 01/10/2026. Destino: especialização da vertical, não
uma extensão declarativa instalada. O núcleo continua útil sem esta jornada.
Não substituir propostas, contatos ou o importador B2B já distribuídos.

## Esclarecimento definitivo do proprietário

OCR pertence ao módulo Documentos: contrato/PDF escaneado → extração → revisão
da diagramação → modelo reutilizável → campos do cliente → PDF preenchido.
A base de clientes entra por planilha. OCR avulso no computador ou simples
transcrição em textarea NÃO atende o fluxo de modelos. Assinatura e carimbo
podem ser enviados manualmente em PNG transparente e posicionados separadamente.
Gov.br somente pelo portal com retorno manual; API direta não está disponível
como integração comum para o CRM privado. DocuSign é integração própria futura.

## Tratamento do acervo

Originais imutáveis; hash SHA256, arquivo/aba/linha/página acompanham cada
extração. Macros, atalhos e documentos executáveis nunca são executados.
Extrações e imagens são privadas, fora do Git. OCR é processamento local
limitado, com idioma, motor e posição de cada palavra; resultado é candidato,
nunca dado confirmado ou evidência de autenticidade. Não alimentar RAG com
documentos pessoais ou históricos automaticamente.

A planilha histórica não é uma lista de clientes. Preservar atendimento,
endereço/local, valor bruto, data e observação separadamente do cadastro.
Nome igual gera revisão, não fusão. Telefone compartilhado ou endereço igual
também não prova identidade. IDs antigos repetidos não são chaves novas.
Semelhanças encadeadas não podem reunir pessoas por transitividade. Cada
linha deve ter uma chave de origem; um cadastro aprovado pode possuir muitos
locais e atendimentos. Valores ambíguos permanecem brutos, sem virar dinheiro.

## Emissor e assinaturas visuais

Entrada pela aba Documentos, papel mínimo agent para preparar prévias.
Documento A4 de páginas explícitas, texto por página e posições medidas em
milímetros a partir do canto superior esquerdo. PNG transparente fornecido
pelo usuário, signatário/qualificação e posição por página. Nunca extrair
autógrafo de documento antigo para reutilização. Sem URL de imagem arbitrária.
Limites de corpo, imagem, páginas e texto verificados no servidor.

Primeiro incremento é uma PRÉVIA: nenhuma numeração oficial, persistência,
certificação, envio ou emissão fiscal. PDF identifica rascunho e assinatura
visual. Conta/organização atual vem do guard. Imagens permanecem em memória e
não são gravadas em log, localStorage ou banco neste incremento.

Emissão definitiva exige arquivo privado por organização, versões imutáveis,
hash, vínculo explícito ao cliente/empresa/local/atendimento, modelos e emissores
cadastrados, administrador definindo quem pode usar cada assinatura, auditoria
e idempotência. Schema opcional precisa provisionador/migration/baseline/MANIFEST
conforme doutrina; não improvisar tabela aberta ou JSON sem contrato.

## Assinatura eletrônica externa

PNG não é assinatura criptográfica. O stub PAdES herdado não assina e não deve
ser oferecido como integração pronta. Gov.br: exportar PDF para assinatura no
portal e receber documento assinado, sem alterar os bytes; integração direta
depende de elegibilidade, não presumida para uma empresa privada. Validação
independente pelo ITI; arquivo recebido não fica automaticamente "validado".
DocuSign: adaptador separado, OAuth no servidor, sandbox primeiro, webhook
autenticado/idempotente, hash e trilha do provedor. Não criar envelope nem enviar
PII sem configuração, orçamento e autorização de envio.

Notas fiscais: armazenar notas já emitidas e vincular ao serviço; emissão fiscal
depende de descoberta do município/provedor, certificado e regras aplicáveis.
Recibo comercial ou prévia não se apresenta como nota fiscal.

## Aceite

- OCR português recupera texto de imagem sem mudar o original; fila limitada.
- Duplicidade preserva todas as linhas e expõe evidência sem fusão automática.
- Prévia autentica/autoriza, recusa origem externa e limites inválidos.
- PNG e retângulo fora da página são recusados; PDF contém marca de prévia.
- Fluxo existente de propostas continua intacto.
- Nenhum dado real, segredo, autógrafo ou documento entra no Git.
- G13 e publicação continuam condicionados ao aceite hospedado.
