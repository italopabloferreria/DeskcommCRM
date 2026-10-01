# O que mudou na vertical LimpaxCRM

Comparação do código com o ancestral comum `50d14bd983bf35a878876451399e8832ff8e9ee0`
de `origin/main`. Isso não é comparação com uma release futura do upstream.

| Função | Origem e estado |
| --- | --- |
| Login/frontend, contatos, funis, tarefas, agenda e IA | Herdados do Deskcomm; não desenvolvidos do zero para Limpax. |
| Empresas e pessoas | Módulo B2B herdado, habilitado na instalação separada; ajustamos o fluxo de vínculos na tela de empresa. |
| WhatsApp/WAHA | Integração herdada; verificamos QR/permissões e conexão local. Serviço local está desligado e VPS não existe. |
| Propostas, modelos e PDFs | Herdados. O módulo geral Documentos é adicional; propostas continuam intactas. |
| Duplicados de contatos | Detecção/mesclagem herdada por telefone/e-mail; não resolve sozinha homônimos, planilha histórica ou locais de serviço. |
| Identidade | Marca LimpaxCRM, logo/cores de entrada e bootstrap do proprietário; iCBAI como responsável pelo desenvolvimento. |
| Convites | Entrada fechada por convite; proteção para convites revogáveis e configuração de administradores convidando. |
| Base de demonstração | Seed fictício repetível com empresas, pessoas, contatos, oportunidades, tarefas e agenda, com proposta de demonstração sem envio. |
| Planilhas | Prévia e mapeamento editável; exportações CSV paginadas; proteção contra fórmulas; limites de expansão XLSX. CSV/XLSX B2B não importa ainda todo o histórico XLSM real. |
| Importação atômica | RPC preparada para repetição segura e rollback por lote; migração0495 ainda não aplicada. |
| Implantação | Kit/release ARM, imagens por CI, manifesto e sondas; recuperação endurecida e backup administrativo privado. Não significa implantação final ou restauração comprovada. |
| Documentos (incremento atual) | Aba e emissor de prévias; assinatura/carimbo em PNG, posição/tamanho/página, administrador e validação no servidor. Ainda sem arquivo persistente, cadastro de modelos ou numeração definitiva. |
| OCR e assinatura externa | OCR para contratos reutilizáveis é pedido aprovado, ainda sem fluxo no CRM. Gov.br usa portal externo com retorno manual; não anunciar API privada disponível. DocuSign não conectado. Stub PAdES herdado não certifica PDF. |

Os arquivos reais e textos extraídos ficam fora do Git. A análise da planilha
preserva o histórico, sem considerar nome repetido prova de identidade.
Não importar dados reais ou aplicar migration sem os gates correspondentes.
