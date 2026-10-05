# Hospedagem do LimpaxCRM — avaliação de alternativas

Verificado em 05/10/2026. Restrição do titular: custo zero, sem upgrade pago ou dependência de créditos temporários. Nenhuma conta, recurso, túnel ou publicação criado nesta avaliação.

O candidato atual exige aplicação Next, worker, scheduler, WAHA, Redis, ponte HTTP Redis e Caddy. Supabase operacional permanece separado. O runtime aprovado exige Linux ARM64; trocar para plataforma x86 ou serverless precisa distribuição compatível e validação própria, não apenas mudar a URL.

| Opção | Oferta verificada | Implicação para este projeto |
| --- | --- | --- |
| Oracle existente | Capacidade atual não consultada: console aguarda autenticação. Recusas anteriores foram por capacidade A1. | Caminho já preparado com imagens ARM; conferir cota/custo e disponibilidade na conta antes de criar. Não há prazo garantido. |
| Render gratuito | Web service com 512 MB; suspende após 15 minutos sem tráfego; filesystem efêmero. | Não substitui a instalação completa com WhatsApp persistente. Eventual demonstração parcial exigiria adaptação e teste; não aprovado para operação empresarial contínua. |
| Vercel Hobby | Uso pessoal e não comercial. | Não atende ao uso empresarial solicitado. Não publicar o CRM comercial nesse plano como alternativa gratuita. |
| Google Cloud e2-micro | Uma VM elegível em três regiões dos EUA, 1 GB RAM, 30 GB-mês de disco padrão e 1 GB de saída mensal. | Não é equivalente à A1 preparada. Não comprovamos o conjunto de serviços com 1 GB; oferta é x86, incompatível com runtime ARM atual. IPv4 externo tem cobrança fora da franquia de uma hora/mês. Não aprovado como VPS pública de custo zero. |

Conclusão técnica: nenhuma dessas três alternativas foi comprovada como substituta gratuita da instalação completa. Isso não afirma que inexista outro provedor; evita promover oferta parcial ou trial como hospedagem operacional já resolvida. Não criar recursos que possam cobrar. Seguir com a conta Oracle existente após autenticação; caso não haja capacidade, ampliar avaliação ou discutir mudança explícita de custo/escopo antes de instalação.

Fontes primárias consultadas:

- [Render — serviços gratuitos](https://render.com/docs/free) e [recursos dos planos](https://render.com/docs/compute-plans).
- [Vercel — Hobby](https://vercel.com/docs/plans/hobby) e [uso permitido](https://vercel.com/docs/limits/fair-use-guidelines).
- [Google — Free Tier e trial](https://docs.cloud.google.com/free/docs/free-cloud-features), [máquinas E2](https://docs.cloud.google.com/compute/docs/general-purpose-machines#e2_shared-core) e [preço de IP externo](https://cloud.google.com/vpc/network-pricing#ipaddress).

Trials não são permanentes: Google exige método de pagamento para cadastro; sem upgrade, recursos param após o prazo/créditos. Cadastro e aceite de condições não foram executados. Banco/Storage/clientes não foram migrados nem compartilhados com outro provedor.

Próximo executável: titular autentica Oracle no Chrome; agente confere uso/cotas/rede e prepara tentativa gratuita. Depois: instalação por manifesto, HTTPS/login/perfis/PDFs/desempenho e WhatsApp empresarial. G13 permanece aberto.
