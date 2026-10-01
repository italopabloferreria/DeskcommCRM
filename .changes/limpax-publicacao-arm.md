---
impacto: capacidade_nova
secao: adicionado
titulo: Publicação das imagens ARM próprias da Limpax
---
O fork publica app, worker e scheduler no seu próprio registro depois dos checks de qualidade e das cinco sondas nas imagens ARM. O manifesto de instalação registra commit e digests das três imagens testadas; tags identificam também execução/tentativa e não mudam stable/latest. A publicação não implanta o site, não altera o Supabase e não envia mensagens. Pacotes novos precisam ter sua visibilidade/acesso de download verificados antes da VPS. Destino: infraestrutura da vertical Limpax.
