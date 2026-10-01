---
impacto: capacidade_nova
secao: corrigido
titulo: Limites de segurança para planilhas XLSX no LimpaxCRM
---
O importador recusa planilhas XLSX cuja soma dos XML descompactados exceda 40 MB ou que referenciem mais de 256 colunas, evitando consumo excessivo de memória mesmo quando o arquivo enviado é pequeno. Entidades numéricas XML inválidas deixam de interromper a análise. Destino: núcleo do importador B2B usado pela vertical Limpax.
