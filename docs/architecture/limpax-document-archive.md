# Arquivo privado de prévias PDF

Vertical Limpax: Documentos > Salvar PDF no CRM > PDFs arquivados > Baixar PDF.
POST exige admin, origem exata, escrita permitida e JSON limitado; renderiza a prévia existente. Contato opcional é validado pela sessão/RLS e organização. Alteração manual dos campos limpa vínculo na UI. Storage administrativo usa exclusivamente documentos-privados/{organization}/arquivos/{uuid}.json, bucket não público, envelope máximo1MB. PDF base64, hash bytes e hash do pedido conservam snapshot imutável e replay idempotente mesmo que a renderização mude timestamp. GET pagina25, valida integridade e contato ainda não anonimizado; download private/no-store. Falha fecha acesso e mostra aviso; sem worker. document.created registra criação sem conteúdo do documento. Não certifica assinatura PNG, não emite NF, não transforma prévia em documento definitivo.

Tests: arquivos.test.ts, archive/route.test.ts e limpax-documentos-arquivos-ui.test.tsx. Validação real autenticada pendente por expiração da sessão local; nenhuma gravação remota nesta etapa.
