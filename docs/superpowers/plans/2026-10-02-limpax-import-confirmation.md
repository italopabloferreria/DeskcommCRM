# Bloco de confirmação histórica

Autorização do proprietário: “Ok” após proposta do bloco completo de inventário,
confirmação, reversão, testes, documentação e commit/push. Sem carga real ou
instalação operacional. Código preparado não comprova recuperação/aceite G13.

- [ ] Inventariar originais/cópias privadas sem publicar conteúdo pessoal.
- [ ] Confirmar lote revisado por API: origem, papel, suporte, hash e recibo.
- [ ] Interface: aceite explícito, resultado durável e reenvio sem duplicação.
- [ ] Reversão administrativa lógica do lote, preservando cadastros/origem.
- [ ] Preparar fonte SQL distribuível, provisionamento opcional e contrato.
- [ ] Testes sintéticos PostgreSQL15/17, API/UI e governança remota.
- [ ] Registrar evidência, atualizar handoffs e commit/push.

Ordem operacional: restore Supabase isolado → preflight/ROLLBACK → instalação
autorizada → aceite hospedado → revisão/carga real autorizada. Fonte SQL pode
ser preparada antes da recuperação; sua aplicação continua bloqueada.
