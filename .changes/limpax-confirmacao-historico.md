---
impacto: capacidade_nova
secao: adicionado
titulo: "Confirmar e reverter lotes históricos com recibo"
---

A revisão da planilha pode confirmar o lote inteiro após aceite explícito,
conservando todas as células originais. Um recibo durável evita repetir o
arquivo ao reenviar; decisões diferentes para o mesmo arquivo são recusadas.
A ficha do lote pagina todas as linhas e permite ao administrador anular
logicamente os serviços, conservando cadastros, locais e origem. Serviços já
corrigidos ou anonimizados exigem tratamento individual.

Fonte SQL preparada em 0507 e baseline: tabelas e gatilhos nascem somente pelo
provisionador explícito. Sua instalação no banco ativo continua condicionada
à prova de recuperação e ao preflight autorizado. Não habilita carga real,
retenção automática, mensagens, fiscal ou deploy.
