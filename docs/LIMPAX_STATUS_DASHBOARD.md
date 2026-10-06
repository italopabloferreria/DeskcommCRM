# LimpaxCRM — dashboard de acompanhamento

Atualizado em05/10/2026. **MVP funcional para apresentação local acompanhada. Produção/G13 ainda não liberada.** Dashboard manual; histórico de execução em HANDOFF-LIMPAX.md.

## Concluído

- Clientes:4050 contatos importados/4066 totais; paginação não representa total.5050 linhas,9 abas e11 lotes preservados. Exportação CSV real conferida.
- Histórico CADASTRO no contato:1950 observações preservadas,1856 vinculadas; conteúdo literal, datas, valores e origem. Sem atividade ou pagamento inventados.
- Revisão de identidades:212 grupos candidatos, sem mesclagem automática.94 observações sem contato ficam preservadas até identificação.
- Documentos: OCR no navegador, revisão, modelos reutilizáveis, preenchimento por cliente, assinatura/carimbo PNG manual com posições, PDF privado arquivado e download conferido. PNG não é assinatura certificada; PDF não é nota fiscal.
- Limpeza da conexão pessoal concluída; zero conexões ativas, mensagens e conversas após limpeza. Clientes preservados.
- Backup limpo restaurado em ambiente isolado, Auth e aplicação exercitados;222 tabelas/632 políticas,6 objetos e4 PDFs conferidos. Bancada encerrada.
- Depuração05/10: paginação atravessa contatos sem atividade; seleção de cliente atualiza destinatário; busca de contato funciona sem módulo de empresas.160 testes de auditoria +18 de regressão, typecheck integral e lint direcionado aprovados. [Relatório](LIMPAX_DEBUG_20261005.md).
- Local3000 disponível. Original em edição preservado; testes visuais não salvaram dados reais.

## Estamos aqui

Blocos1/2 concluídos. Bloco3 aguarda hospedagem. Oracle autenticada, tentativa A1 2/12 retornou capacidade insuficiente AD-1; nenhuma VPS criada. Custo zero preservado. Titular decidiu apresentar localmente e solicitar contratação de VPS ao cliente; nenhuma compra autorizada ao agente.

## O que falta

- Release corrigida9d164e1ec: CI37376993451 SUCCESS, três imagens ARM conferidas anonimamente e manifesto validado. Roteiro atual: [VPS do cliente](runbooks/limpax-client-vps-rollout.md). Próximo executável: confirmar arquitetura/hostname/acesso à VPS e preparar configuração privada antes do plano de instalação.
- Externo: contratação e acesso à VPS. Depois instalar stack, validar HTTPS/login/perfis/PDFs/desempenho, conectar WhatsApp empresarial autorizado e fechar G13 antes de uso público.
- Transição operacional: identificar registros ambíguos e vincular históricos das outras abas explicitamente; não inferir identidades nem estados por cores.
- Roadmap: crm.limpaxdf.com.br, DocuSign configurado, retorno manual de arquivo assinado Gov.br, IA conforme configuração. Gov.br não possui integração automática implementada; DocuSign não conectado.

Compatibilidade06/10:37 testes de guardas passaram; runtime ARM recusa x64 antes de execução. Roteiro registra preparação específica para Intel/AMD; instalador upstream não deve ser usado como entrega das extensões Limpax.
