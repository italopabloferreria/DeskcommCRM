---
impacto: capacidade_nova
secao: corrigido
titulo: Restauração interrompe em erro SQL e backups ficam privados
---
O kit confere a integridade do arquivo comprimido antes de enviar SQL ao banco e interrompe a restauração no primeiro erro SQL, evitando anunciar sucesso e restaurar anexos após uma falha. A pasta de backups passa a permitir acesso apenas ao dono. A restauração pode ficar parcial quando ocorre erro; valide a recuperação em uma instalação descartável antes de usar o backup. Destino: infraestrutura de operação do CRM.
