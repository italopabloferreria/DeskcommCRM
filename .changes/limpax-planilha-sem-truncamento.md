---
impacto: capacidade_nova
secao: corrigido
titulo: Planilhas com células sem cabeçalho não são truncadas
---

CSV e XLSX são recusados quando há conteúdo além da última coluna nomeada, preservando a possibilidade de corrigir o arquivo antes de analisar ou importar. Zero conta como preenchido; células extras vazias continuam permitidas. A recusa ocorre antes de acessar o banco. Destino: núcleo do leitor B2B existente.
