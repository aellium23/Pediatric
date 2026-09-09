# 07 · Prompt para gerar o storyboard dos dois vídeos

> **Como usar:** copia o bloco da secção 2 inteiro para o teu assistente. Ele
> devolve dois storyboards prontos a produzir — planos numerados com prompt de
> Runway, locução para o ElevenLabs, texto de ecrã e notas de montagem para o
> DaVinci.
>
> O prompt carrega os **factos verificados do produto** e as **restrições**, para
> o storyboard não inventar promessas. Se alterares funcionalidades, atualiza o
> bloco de factos antes de o voltar a usar.
>
> **Preços ficam de fora dos vídeos**, por decisão — estão em revisão, e um
> vídeo com números fica desatualizado no dia em que mudam. O prompt proíbe-os
> explicitamente, no áudio e no ecrã. Duas afirmações sobrevivem porque são
> sobre controlo e posicionamento, não sobre preço: *"o pediatra define os seus
> preços"* e *"a ficha da criança é gratuita"*. Se quiseres a segunda também
> fora, é uma linha a menos no bloco.
>
> Cadeia: **Runway** (planos), **ElevenLabs** (voz PT-PT), **DaVinci Resolve**
> (montagem, legendas, masters).

---

## 1. Os dois vídeos

| | Vídeo A | Vídeo B |
|---|---|---|
| Para | Pediatras | Famílias |
| Objetivo | Marcar uma conversa de 20 minutos | Instalar a app e criar a ficha |
| Duração | 60–75 s | 30–40 s |
| Onde vive | LinkedIn, email, WhatsApp para colegas | Instagram/Facebook, WhatsApp, página de entrada |
| Formatos | 16:9 e 9:16 | 9:16 primeiro, 16:9 depois |

---

## 2. O prompt

```
És diretor criativo de uma agência que faz vídeo para produtos de saúde.
Preciso do STORYBOARD COMPLETO de dois vídeos curtos, prontos a produzir com
Runway (geração de planos), ElevenLabs (locução) e DaVinci Resolve (montagem).

═══════════════════════════════════════════════
O PRODUTO — factos verificados, não alterar
═══════════════════════════════════════════════
HOC / Pédia. Plataforma portuguesa de pediatria onde a FICHA DE SAÚDE DA
CRIANÇA vem primeiro e a consulta acontece dentro dela. Não é um marketplace
de videochamadas: é o registo da criança, com pediatras lá dentro.

O que existe e funciona:
- Ficha da criança: crescimento com percentis da OMS, vacinas, alergias,
  medicação, problemas de saúde, marcos de desenvolvimento, linha do tempo.
  GRATUITA e ilimitada, com ou sem plano.
- Cofre de documentos: relatórios, análises e receitas, cifrados.
- Leitura de documentos por IA: PROPÕE alergias, vacinas e medicação; nada
  entra na ficha sem o pai confirmar, item a item.
- Consulta por mensagem: o pediatra define a janela e o prazo. Sem resposta
  dentro do prazo, o pai é reembolsado automaticamente.
- Videoconsulta marcada por slots.
- Exportação da ficha em FHIR R4 (formato aberto europeu). A família leva os
  dados quando quiser.
- Pediatras verificados: cédula profissional conferida antes de atenderem.
- Sinais de alarme graves: a app manda ligar 112 / SNS 24. Lista fixa, igual
  para toda a gente, não decidida por IA.

PREÇOS ESTÃO FORA DE ÂMBITO. Não menciones nem mostres valores, mensalidades,
percentagens de comissão, nomes de planos, descontos ou "a partir de X". Estão
em revisão e um vídeo com números fica desatualizado no dia em que mudam.
O que PODE ser dito, porque é sobre controlo e não sobre preço:
- O pediatra define os seus próprios preços e horários.
- A ficha da criança é gratuita e ilimitada.

═══════════════════════════════════════════════
O QUE NÃO PODE APARECER — regra absoluta
═══════════════════════════════════════════════
Isto é saúde infantil. Uma promessa a mais destrói a confiança toda.

- NÃO dizer nem sugerir que a app diagnostica, avalia gravidade, faz triagem
  ou diz o que a criança tem. Não faz, de propósito.
- NÃO dizer que substitui a urgência ou o médico de família.
- NÃO prometer tempo de resposta da plataforma ("resposta em 15 minutos"). O
  prazo é o de cada pediatra.
- NÃO mostrar nem sugerir crianças doentes em sofrimento, choro, hospital,
  soro, urgência. Tensão sim, aflição não.
- NÃO usar bata branca + estetoscópio como cliché, nem atores a fingir de
  médicos com ar de autoridade.
- NÃO inventar depoimentos, nomes de médicos, números de utilizadores,
  prémios ou logótipos de imprensa.
- NÃO afirmar que os pagamentos estão ativos: o produto está em piloto, com
  pagamentos simulados e sem faturação certificada.
- NÃO dizer preços, mensalidades, comissões nem nomes de planos. Nem no áudio,
  nem no texto de ecrã, nem no cartão final. Se um plano só funcionar com um
  número, reescreve o plano.
- NÃO comparar com o SNS nem com concorrentes.

═══════════════════════════════════════════════
RESTRIÇÕES TÉCNICAS DA PRODUÇÃO
═══════════════════════════════════════════════
Runway gera clipes de 5 a 10 segundos e é MAU a: texto legível, mãos,
interfaces de software, lábios sincronizados, rostos consistentes entre
planos. Portanto:
- Cada plano gerado tem de caber em 10 segundos e funcionar SEM texto dentro
  da imagem. Todo o texto entra no DaVinci.
- Os ecrãs da app NÃO são gerados por IA. São gravação de ecrã real do
  produto — marca esses planos como [ECRÃ REAL] e descreve exatamente o que
  gravar e onde clicar.
- Evita rostos de crianças identificáveis. Preferir: mãos, objetos, ambientes,
  silhuetas, planos de nuca, detalhes (um boletim de vacinas em cima da mesa,
  um telemóvel na escuridão da cozinha, um armário de casa de banho aberto).
  É melhor eticamente e evita o efeito estranho do rosto gerado.
- Locução em português europeu. Escreve o texto para ser DITO, não lido:
  frases curtas, sem parênteses, e números por extenso quando ajuda a dicção
  ("cento e doze" em vez de "112", "SNS vinte e quatro" em vez de "SNS 24").

═══════════════════════════════════════════════
O QUE CADA VÍDEO TEM DE FAZER
═══════════════════════════════════════════════

VÍDEO A — PEDIATRAS. 60 a 75 segundos.
Objetivo: marcar uma conversa de 20 minutos.
O medo dele é ser transformado em fornecedor intermutável, avaliado por
estrelas, a competir por preço. A promessa não é "temos doentes para si", é
"não te pedimos que mudes nada".
Bater nestes pontos, por esta ordem:
1. Reconhecimento: as mensagens de pais que já recebe fora de horas, no
   telemóvel pessoal, de graça.
2. O sítio onde essas mensagens deviam acontecer — janela e prazo definidos
   por ele; sem resposta, o pai é reembolsado e ele não deve nada.
3. A diferença que interessa: abre a criança e a ficha já lá está. Os cinco
   minutos de "conte-me a história" já estão feitos.
4. Ele define os preços e os horários — sem dizer quais. Sem trabalho
   administrativo do lado dele.
5. Não prende os doentes dele: a família leva a ficha em formato aberto.
6. Fecho: convite para 20 minutos.

VÍDEO B — FAMÍLIAS. 30 a 40 segundos.
Objetivo: instalar e criar a ficha.
O pai não compra telemedicina. Compra não ter de decidir sozinho às nove da
noite, e deixar de ser o arquivo da saúde do filho.
Bater nestes pontos:
1. Nove da noite, febre, a dúvida entre esperar e ir à urgência.
2. Escreve a um pediatra verificado, com o prazo que ele garante. Sem
   resposta, reembolso automático.
3. E fica tudo guardado: vacinas, peso, alergias, relatórios.
4. Da próxima vez que perguntarem "conte-me a história dele", a resposta está
   no telemóvel.
5. Fecho: a ficha é gratuita. Começa por aí.
NÃO mencionar o plano nem quanto custa uma consulta. O objetivo do vídeo é a
ficha, e a ficha não se paga.

═══════════════════════════════════════════════
FORMATO DA RESPOSTA
═══════════════════════════════════════════════
Para CADA vídeo, devolve:

(a) Uma tabela de planos, uma linha por plano:
    Nº | Duração | Imagem (prompt para Runway, em inglês, com plano,
    iluminação, lente e movimento de câmara) | Locução PT-PT | Texto no ecrã |
    Notas para o DaVinci

    Marca com [ECRÃ REAL] os planos que são gravação do produto e escreve o
    que gravar, passo a passo.

(b) O guião de locução corrido, limpo, pronto a colar no ElevenLabs — sem
    números de plano nem indicações cénicas, com pontuação a marcar as pausas.

(c) Sugestão de música: género, andamento, e onde entra e sai.

(d) A versão 9:16 explicada: que planos mudam de enquadramento e onde entram
    as legendas, assumindo que a maioria vê sem som.

(e) Um cartão final com a chamada à ação, diferente em cada vídeo.

Escreve tudo em português de Portugal, exceto os prompts de imagem para o
Runway, que devem ir em inglês.
```

---

## 3. Notas de produção

**Grava os ecrãs reais antes de gerar seja o que for.** O produto está em
`pediatric-taupe.vercel.app`. Os três planos que valem a pena: a ficha da
criança com as curvas de crescimento, o cofre com um documento, e o ecrã de
enviar pergunta com o prazo à vista. São eles que provam que existe — nenhum
plano gerado por IA faz isso.

**Cuidado com o que está no ecrã ao gravar.** Os dados são de demonstração,
mas grava com nomes de personas do seed e não com dados de pessoas reais.

**Legendas queimadas, sempre.** A maior parte vê sem som, sobretudo o vídeo
das famílias.

**Antes de publicar:** publicidade a serviços de saúde é regulada em Portugal
(regras da Ordem dos Médicos, supervisão da ERS). Passa o guião final pelo
mesmo jurista que vai assinar a qualificação regulatória — está em
`docs/strategy/06-pitch-vendas.md`, secção final.

**Se o piloto ainda não arrancou quando publicares**, o vídeo das famílias
precisa de uma linha a dizê-lo, ou estás a angariar para uma lista de espera
sem o dizer.

---

*Última atualização: 2026-09-09. Factos conferidos contra o código nessa data.*
