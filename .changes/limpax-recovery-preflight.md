---
impacto: capacidade_nova
secao: adicionado
titulo: "Conferir recuperação com inventário privado e comparação somente leitura"
---

A ferramenta operacional confere tamanho, checksum e cobertura do backup e
registra contagens, hashes de conteúdo, estrutura e permissões em arquivo privado.
Uma comparação posterior recusa usar o banco ativo como destino e revela
diferenças mesmo quando a quantidade de linhas permanece igual. Conexão exige
TLS verificado e transação somente leitura; credenciais não entram no relatório.

Não restaura dados, instala migrações ou aprova recuperação integral. Login,
configurações de Auth, chaves externas e arquivos exigem provas próprias.
