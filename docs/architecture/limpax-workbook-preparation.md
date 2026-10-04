# Caminho de preparação integral da planilha Limpax

Destino: vertical Limpax, preparação interna; núcleo comum permanece inteiro.

`workbook-batches.ts` → arquivos privados por aba → `workbook-integrity.ts`
→ `workbook-history-command.ts` → comando histórico com origem integral.

O consumidor atual é o teste/preparação privada. O adaptador não está ligado
à confirmação da UI nem realiza RPC. `original_reference` conserva a origem
física; `source_sha256` do comando é o hash imutável do lote. Assim a mesma
linha em abas diferentes não compartilha recibo. Arquivo bruto segue no payload.

Checklist: entrada lotes privados; saída comando revisado; sem mutação, portanto
sem auditoria de cliente; superfície existente Importações ainda não habilita
este adaptador. Falha interrompe e preserva fonte para correção; identidade
sem decisão continua pendente. Continuidade IA/humano não aplicável à preparação.

Limitação: mapear linhas operacionais continua responsabilidade do consumidor;
autorização/pertencimento são validados pelo servidor/SQL antes de qualquer
uso. Recuperação isolada e teste transacional/RLS continuam obrigatórios.
