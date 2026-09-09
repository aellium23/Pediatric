# 06 · Pitch de vendas — angariar pediatras e famílias

> Dois públicos, dois materiais, uma história. Números verificados no código a
> 2026-09-09 (`subscriptions.module.ts`, `stripe.service.ts`, `seed.ts`).
>
> Regra do documento: **não vender o que ainda não existe.** A tabela do que
> não prometer está no fim e é a parte mais importante.

---

## ⚠️ Antes de vender: o plano Família perde dinheiro em cada subscritor ativo

| | |
|---|---|
| Plano Família | **€9,90**/mês, inclui **2** consultas por mensagem |
| Consulta por mensagem (preço do seed) | **€18** → o pediatra recebe **€14,40** (comissão 20%) |
| Família que use as duas incluídas | custo **€28,80** contra receita **€9,90** |
| **Margem por subscritor ativo** | **−€18,90/mês** |

E a exposição é **ilimitada ao contrário**: `includedMessages` é um compromisso
da plataforma, mas quem fixa o preço da consulta é cada pediatra. Um que cobre
€30 leva a perda a −€38,10.

Enquanto isto for assim, **angariar famílias para o plano acelera a perda**. As
saídas possíveis, por ordem de facilidade:

1. **Baixar a inclusão para 1 consulta/mês.** Uma linha em `PLANS`. Continua a
   perder €4,50 no preço do seed, mas fica sustentável com preços mais baixos
   ou comissão mais alta na consulta incluída.
2. **Subir o preço do plano.** A €29,90 com 2 incluídas a conta fecha.
3. **Teto ao valor coberto.** A inclusão cobre até €X por consulta; acima
   disso a família paga a diferença. Protege contra o pediatra caro.
4. **Comissão diferente na consulta incluída.** A plataforma já financia o ato;
   pode financiá-lo com margem menor para o pediatra, se ele aceitar em troca
   de volume garantido.

**Decisão de fundador, não de engenharia.** Mas o material abaixo assume que
está resolvida — não vendas o plano antes disso.

---

# Parte A · Pediatras

## O ângulo

Um pediatra não precisa de mais um marketplace. O medo dele é ser transformado
em fornecedor intermutável, avaliado por estrelas, a competir por preço. **A
venda não é "temos doentes para si". É "não te pedimos que mudes nada".**

## Pitch de 60 segundos

> Quantas mensagens de pais é que recebes fora de horas, no telemóvel pessoal,
> de graça?
>
> Nós construímos o sítio onde essas mensagens deviam acontecer. Tu defines as
> tuas janelas — por exemplo, das 19h às 21h em dias de semana. Dentro delas,
> respondes quando puderes, dentro do prazo que **tu** escolheste. Se não
> responderes, o dinheiro volta ao pai automaticamente e não deves nada a
> ninguém.
>
> A diferença para tudo o resto: quando abres a criança, a ficha já lá está.
> Crescimento com percentis, vacinas, alergias, medicação, os relatórios que a
> família carregou. Não começas do zero numa chamada de vídeo.
>
> Tu defines o preço. A plataforma fica com 20%. A faturação, o split e o
> pagamento são automáticos — não há administrativo do teu lado.
>
> E não prendemos os teus doentes: a família descarrega a ficha em formato
> aberto quando quiser.

## Os números, ditos com clareza

| | |
|---|---|
| Quem define o preço | **O pediatra**, por serviço (mensagem, vídeo) |
| Comissão da plataforma | **20%** |
| Plano Pediatra Pro | €19/mês → comissão **15%**, perfil em destaque, estatísticas |
| Quando o Pro compensa | a partir de **€380/mês** faturados na plataforma |
| Exemplo (preço do seed) | mensagem €18 → recebe €14,40 · vídeo €45 → recebe €36 |
| Se não responder no prazo | reembolso automático ao pai; **o pediatra não deve nada** |

O break-even do Pro é o número mais honesto que lhe podes dar: mostra que não
estás a empurrar uma subscrição, estás a dizer-lhe quando é que ela faz sentido.

## Objeções, e o que responder

**"De quem é a responsabilidade clínica?"**
> Tua, como em qualquer consulta. A plataforma não decide nada — não faz
> triagem, não classifica gravidade, não sugere diagnóstico. Confirma é que o
> teu seguro de responsabilidade profissional cobre telemedicina; é a única
> coisa que te peço para verificares antes de começar.

**"Não tenho tempo."**
> As consultas por mensagem não são em direto. Defines uma janela e um prazo, e
> respondes dentro dele. Uma questão bem escrita com a ficha à frente leva-te
> menos tempo do que uma chamada.

**"Vou ser avaliado por estrelas como um restaurante?"**
> Há avaliação, uma por consulta e só de quem teve consulta contigo — não há
> comentários anónimos. E o ranking não é por preço.

**"Perco os meus doentes para a plataforma?"**
> Não. A relação é tua, e a ficha é da família — exporta em formato aberto
> europeu. Se saíres, a família leva a ficha e continua contigo.

**"Os meus dados e os dos doentes?"**
> Os campos clínicos estão cifrados na base de dados, todos os acessos ficam
> registados, e a regra de quem pode ver que criança é uma só, no servidor.

**"Já tentei plataformas destas e não apareceu ninguém."**
> Honestamente: ainda não lançámos. Estamos a construir o lado da oferta
> primeiro, porque uma família que faz uma pergunta e não tem resposta não
> volta. É por isso que estou a falar contigo agora e não daqui a seis meses.

## Mensagem para enviar (WhatsApp / email)

> Olá [Nome], tudo bem?
>
> Estou a lançar uma plataforma de pediatria onde a ficha de saúde da criança
> vem primeiro e a consulta acontece dentro dela — quando abres uma criança já
> tens crescimento, vacinas, alergias e os relatórios da família à frente.
>
> Estou a convidar um grupo pequeno de pediatras para o piloto. Tu defines
> horários, serviços e preços; as consultas por mensagem respondes dentro de
> uma janela tua; se não responderes, o pai é reembolsado automaticamente.
>
> São 20 minutos para te mostrar. Tens meia hora esta semana?

---

# Parte B · Pais

## O ângulo

O pai não compra "telemedicina". Compra **não ter de decidir sozinho às nove da
noite** — e, sem saber ainda que quer, deixar de ser o arquivo da saúde do
filho.

Vender só a consulta é vender um seguro que ninguém sente falta. Vender a
ficha é vender uma coisa que se usa quando está tudo bem, que é onde está a
subscrição.

## Pitch de 30 segundos

> São nove da noite e o teu filho tem febre. Não sabes se esperas ou se vais à
> urgência.
>
> Com o HOC, escreves a um pediatra verificado e tens resposta dentro do prazo
> que ele garante. Se não responder, és reembolsado automaticamente.
>
> E fica lá tudo: vacinas, peso, altura, alergias, os relatórios das análises.
> Da próxima vez que alguém perguntar "conte-me a história dele", tens a
> resposta no telemóvel.

## A oferta, sem letra pequena

| | |
|---|---|
| Sem plano | Pagas cada consulta ao preço do pediatra que escolheres |
| Plano Família | €9,90/mês *(sujeito a revisão — ver o aviso no topo)* |
| Ficha da criança | **Gratuita e ilimitada**, com ou sem plano |
| Se o pediatra não responder no prazo | **Reembolso automático** |
| Levar os dados | Descarregas a ficha completa quando quiseres |

**A ficha ser gratuita não é generosidade — é a estratégia.** É o que faz o pai
abrir a app quando ninguém está doente, e é isso que decide se há subscrição.

## Objeções

**"É um médico a sério?"**
> Pediatras verificados: cédula profissional conferida antes de poderem
> atender. Vês o nome, a experiência e as avaliações de quem teve consulta.

**"E se for grave?"**
> Se descreveres sinais de alarme, a app diz-te imediatamente para ligar 112 ou
> SNS 24 — e diz isso a toda a gente que escreva o mesmo. **Não substitui a
> urgência**, e nunca te diz que não é nada.

**"Os dados do meu filho?"**
> Cifrados. Só tu e o pediatra com quem tens consulta. Podes exportar tudo ou
> apagar a conta a qualquer momento.

**"Já pago o médico de família / tenho seguro."**
> Isto não substitui nenhum dos dois. Serve para o intervalo entre eles — a
> dúvida das nove da noite, e o sítio onde a informação fica.

**"E se ninguém responder?"**
> És reembolsado automaticamente, sem teres de pedir.

---

## O que NÃO prometer, aos dois

| Não dizer | Verdade |
|---|---|
| "Já podes começar a faturar" (pediatra) | Pagamentos reais por ligar; no piloto são simulados |
| "Recebes faturas legais" | A faturação certificada é um stub |
| "Temos X pediatras / famílias" | Ainda não lançou. Dizer o número real, mesmo que seja zero |
| "Resposta garantida em Y minutos" | O prazo é o que **cada pediatra** define |
| "A app diz-te o que a criança tem" | Não faz diagnóstico nem triagem, de propósito |
| "Substitui a urgência" | Nunca. Encaminha para 112 / SNS 24 |
| "Os teus dados nunca saem" | Se usares a leitura de documentos por IA, o documento vai para um serviço externo — está escrito no ecrã |

## Antes de publicar seja o que for

📎 **A publicidade a serviços de saúde é regulada em Portugal.** Há regras da
Ordem dos Médicos sobre publicidade médica e supervisão da ERS. Antes de
qualquer campanha paga, página pública de angariação ou material com nome e
foto de médicos, passar o texto pelo mesmo jurista que vai assinar a
qualificação regulatória. Em concreto, evitar: comparações com o SNS ou com
concorrentes, testemunhos com conteúdo clínico, promessas de resultado, e
qualquer coisa que sugira superioridade de um médico sobre outro.

---

*Última atualização: 2026-09-09.*
