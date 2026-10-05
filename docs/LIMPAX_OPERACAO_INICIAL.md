# LimpaxCRM — operação inicial

Estado conferido em 04/10/2026. O CRM está disponível localmente em
http://localhost:3000. A hospedagem e o aceite de produção continuam pendentes.

## Clientes da planilha

Em **Contatos**, a lista mostra quantos registros foram carregados e o total
encontrado. Carregue mais resultados ou busque o cliente; os primeiros 25 não
são toda a base. A auditoria encontrou os 4.050 contatos importados, dentro de
4.065 contatos totais da organização.

Abra a ficha para consultar a origem e o histórico da planilha já vinculado ao
contato. Confira endereço e telefone original quando houver nomes repetidos.
Não una pessoas apenas porque têm o mesmo nome ou telefone.

Em **Importações**, os 11 lotes guardam 5.050 linhas originais das nove abas.
Os registros operacionais das outras abas estão preservados; sua associação
com clientes ainda exige confirmação. Nome da equipe ou da aba não determina
sozinho quem é o cliente.

Esta carga é uma fotografia da planilha. Editar o Excel depois não atualiza o
CRM automaticamente. Para outra carga, analise e confira o mapeamento antes de
confirmar. A análise admite 10.000 linhas; gravações CSV/XLSX usam lotes de até
2.000 linhas. A tela analisa XLSM sem executar macros; a carga integral atual
foi feita pelo processo de lotes revisados.

Use **Exportar contatos (CSV)** em Importações para baixar a lista. O teste
real exportou 4.065 registros e incluiu todos os IDs importados. Esse CSV de
contatos não substitui o backup do banco, das linhas originais e dos documentos.

## Contratos, modelos e documentos

1. Em **Documentos**, selecione um PDF ou uma imagem e use **Ler contrato / OCR**.
2. Revise o texto extraído. Corrija nomes, valores e cláusulas; o reconhecimento
   pode errar e não reconstrói automaticamente a diagramação original.
3. Substitua dados específicos pelos campos do cliente e salve um modelo com
   nome claro. O modelo serve para reutilização; não é o PDF emitido.
4. Busque e selecione o cliente cadastrado para preencher os campos. Confira
   os dados antes de gerar o documento.
5. Se necessário, envie seu PNG transparente de assinatura ou carimbo, preencha
   o emissor e ajuste página, posição e tamanho. A imagem é aplicada ao PDF;
   esse recurso não conecta o CRM ao Gov.br ou ao DocuSign.
6. Use **Salvar PDF no CRM** e depois **Baixar PDF arquivado**. O arquivo guarda
   o documento como estava naquele momento. Alterar o modelo não altera os
   PDFs já arquivados.

O fluxo de arquivo privado e download foi conferido no navegador. O download
direto de prévia não foi confirmado nesta rodada; o caminho de arquivamento
acima passou. Os documentos técnicos com “TESTE TÉCNICO — não utilizar” no
nome são fixtures de validação, sem vínculo a clientes reais; não os use na
operação comercial.

O portal Gov.br abre separadamente. Não há envio ou retorno automático.
DocuSign ainda não está conectado. A prévia não é emissão de nota fiscal.

## Antes de liberar o trabalho da equipe

- Concluir o aceite de cadastro, edição, busca e permissões de cada perfil.
- Confirmar os clientes/locais dos históricos ambíguos; preservar os candidatos
  a duplicidade até decisão fundamentada.
- Concluir a verificação das imagens, instalar em hospedagem disponível e
  validar HTTPS, login e recuperação no ambiente de destino.
- Conectar e testar o WhatsApp com destinatários autorizados. O aviso de
  desconexão significa que nenhuma mensagem entra ou sai desse canal.
- Aprovar o gate de entrada em produção G13 com as evidências do ambiente real.

Os backups de banco e Storage ficam fora do Git. A restauração isolada do
snapshot após a importação recuperou os contatos e linhas de origem; o login
Auth com essa cópia e a aplicação hospedada ainda não foram exercitados.

Evidências e limites: [aceite antes da VPS](LIMPAX_PRE_VPS_ACCEPTANCE.md).
