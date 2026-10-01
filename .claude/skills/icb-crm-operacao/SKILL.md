---
name: icb-crm-operacao
description: 'Especialista operacional no fork do CRM usado pela ICB-AI: consulta o código e a documentação atuais, as skills embutidas e o tutorial em vídeo para explicar onde configurar, como operar, instalar, integrar, diagnosticar e adaptar o CRM. Use quando a pessoa perguntar como usar o meu CRM, onde fica uma configuração, como conectar WhatsApp/Supabase/IA, como preparar um cliente, como resolver um erro, ou quando precisar comparar o fork atual com o tutorial/origem.'
metadata:
  publico: operador, implantador, desenvolvedor
  escopo: fork ICB-AI do CRM
---

# ICB CRM — operação e conhecimento reutilizável

Esta skill é a camada de conhecimento operacional do fork. Ela NÃO congela uma cópia do projeto:
sempre consulta primeiro o estado atual do repositório e usa o tutorial em vídeo como explicação
histórica/operacional complementar.

## Regra de precedência

Quando duas fontes discordarem, use esta ordem:

1. código atual da branch em uso;
2. documentação atual do repositório;
3. skill específica embutida do projeto;
4. tutorial do criador, com versão/data/timestamp;
5. notas internas do fork.

Explique a divergência quando ela mudar o procedimento.

## Antes de responder

1. Identifique a área: instalação, operação, cliente novo, IA, WhatsApp, banco, integrações,
   atualização, troubleshooting ou desenvolvimento.
2. Leia `references/INDEX.md`.
3. Consulte apenas as fontes necessárias.
4. Para fatos que podem mudar, confirme no código/documentação atuais em vez de confiar em memória.
5. Nunca invente valor de variável, endpoint, credencial, caminho de tela ou estado de feature.
6. Nunca revele segredos, tokens, senhas ou chaves encontrados no ambiente.

## Reaproveite as skills do próprio CRM

- Instalação, atualização, VPS, domínio, Supabase, WhatsApp e recuperação:
  `.agents/skills/deskcomm-instalar/SKILL.md`.
- Configuração de um cliente/nicho, agentes, roteadores, follow-ups e conhecimento:
  `.agents/skills/deskcomm-cliente-novo/SKILL.md`.
- Convenções e alterações de código:
  `.agents/skills/deskcomm-doutrina/SKILL.md`.
- Prompt/agente, métricas, extensão e contribuição: use a skill embutida correspondente.

Esta skill coordena essas fontes; não duplica regras que já têm dono.

## Como responder por tipo de pergunta

### "Onde configuro X?"

Dê primeiro o caminho na interface, depois diga os arquivos/serviços envolvidos se isso ajudar.
Se o tutorial mostrar o fluxo, inclua o timestamp registrado em
`references/video-tutorial.md`.

### "Como instalo/configuro para outro cliente?"

Use `deskcomm-instalar` para infraestrutura e `deskcomm-cliente-novo` para a configuração
do negócio. Separe claramente o que é por instalação, por organização e por usuário.

### "Por que isso não funciona?"

1. reproduza/identifique o sintoma;
2. confira documentação e código atuais;
3. procure o caso no troubleshooting oficial;
4. compare com o tutorial somente depois;
5. informe causa provável, prova observável e correção;
6. depois da correção, registre o caso na base de conhecimento se for recorrente.

### "O vídeo diz uma coisa, mas aqui está diferente"

Não force o fluxo antigo. Registre:
- o que o vídeo ensinava;
- timestamp;
- versão/data aproximada da fonte;
- como o projeto atual funciona;
- qual caminho deve ser seguido agora.

## Tutorial em vídeo

O índice e os timestamps vivem em `references/video-tutorial.md`.

Ao incorporar um vídeo:

1. registre URL, autor, data e duração;
2. divida por assuntos, não por blocos arbitrários;
3. mantenha timestamps de início/fim;
4. transforme demonstrações em passos reproduzíveis;
5. cite nomes de telas e campos como aparecem no vídeo;
6. marque qualquer item que precise ser validado contra a versão atual;
7. não armazene transcrição integral quando um resumo operacional estruturado for suficiente.

## Conhecimento do fork

Use `references/fork-notes.md` para registrar apenas diferenças deliberadas do fork:
branding, integrações próprias, decisões locais e comportamentos que divergem do upstream.
Não copie o changelog inteiro.

## Quando aprender algo novo

Se uma configuração, erro ou procedimento for confirmado durante o trabalho e tiver valor futuro,
atualize a referência apropriada com:
- sintoma/pergunta;
- causa ou regra;
- procedimento;
- arquivos/telas envolvidos;
- versão ou commit quando relevante;
- fonte da evidência.

O objetivo é que cada problema resolvido uma vez seja mais fácil de resolver na próxima vez.
