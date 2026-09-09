# 03 · Marcos de desenvolvimento — porque é um registo e não um rastreio

> **Estado:** implementado a 2026-09-09 · **Fabricante:** DES · **Produto:** HOC
> **Âmbito:** `GET/POST /api/health-records/:childId/development` e a secção
> "Desenvolvimento" da ficha da criança
> **Código:** `apps/backend/src/common/development/milestones.ts` (catálogo e
> regras, puro) e o módulo `health-records`
>
> ## ⚠️ Portão por fechar: o catálogo não está clinicamente revisto
>
> A redação portuguesa e a banda etária de cada marco foram escritas por
> engenharia a partir da lista publicada dos CDC. São **a nossa versão**, não
> uma tradução oficial, e **não foram verificadas por um pediatra**. Um marco
> na banda errada preocupa uma família cuja criança está bem, ou tranquiliza
> uma que precisa de ser vista. Está registado em `LAUNCH_READY.md` § E como
> bloqueante antes da primeira família real.

---

## 1. O que foi construído

Uma lista estática e versionada do que a maioria das crianças já faz a cada
idade — 2, 4, 6, 9, 12, 15, 18, 24 e 30 meses, 3, 4 e 5 anos — em quatro
domínios: social e emocional, linguagem e comunicação, aprender e pensar,
movimento. A família assinala o que já viu. O que assinala entra na ficha, na
cronologia e na exportação FHIR, como qualquer outro facto do registo.

Quando há marcos de **idades anteriores** por assinalar, o ecrã mostra-os e
diz: *"vale a pena falar com o pediatra"*. É a mesma forma que a curva de
crescimento já usa há muito — comparar com uma referência publicada e, quando
algo se destaca, mandar falar com uma pessoa.

---

## 2. Porque isto não é um dispositivo médico

Aplicando o MDCG 2019-11, passo a passo, como na secção 5 do documento 01:

| Passo | Resposta |
|---|---|
| 1. É software? | Sim |
| 2. Age sobre dados para além de armazenar, arquivar, comunicar ou pesquisa simples? | **Não** — guarda o que a família assinalou e mostra o que da lista publicada não tem marca. A comparação é a de uma checklist em papel |
| 3. É em benefício de doentes individuais? | — |
| 4. A finalidade cai no art. 2.º(1) do MDR? | — |

O que sustenta a resposta ao passo 2 são quatro ausências, todas verificadas
por testes e não apenas afirmadas aqui:

1. **Não há pontuação.** Nem número, nem proporção, nem "8 em 10". A resposta
   da API tem sete campos e nenhum é um resultado; há um teste end-to-end que
   falha se aparecer um oitavo.
2. **Não há nível de risco.** Nenhuma classificação, nenhuma cor de gravidade,
   nenhum limiar. Um marco por assinalar e vinte produzem exactamente a mesma
   frase.
3. **Não há condição nomeada.** Em nenhum ponto do catálogo, da API ou do
   ecrã aparecem as palavras "atraso", "risco", "autismo" ou "diagnóstico" —
   também isso é um teste.
4. **A ausência de marca não é lida como ausência do marco.** Não existe linha
   na base de dados para "não faz". Existe linha para "já vi fazer". A
   diferença é a que separa um registo de um rastreio, e é dita ao pai no
   próprio ecrã: *"pode ser só porque te esqueceste de as marcar"*.

### 2.1 O ponto fraco, dito antes de alguém o encontrar

A lista **é personalizada pela idade da criança**. Isso contraria a leitura
literal do controlo da secção 7 do documento 01 — *"nenhum dado clínico da
criança entra no cálculo"* — que foi escrito a pensar no **detetor de sinais de
alarme**, onde é uma restrição absoluta e continua a sê-lo.

Duas coisas a separar, e o jurista tem de as separar explicitamente:

- **O detetor de sinais de alarme** não personaliza nada. A mesma frase produz
  o mesmo resultado para qualquer criança. Sem exceções.
- **O crescimento e os marcos** comparam com uma **referência populacional
  publicada** em função da idade (e, no crescimento, do sexo). É o que uma
  curva de crescimento em papel faz desde os anos 70 e o que a lista dos CDC
  faz em papel numa sala de espera. Colocar um ponto numa curva publicada não
  é a mesma coisa que produzir um resultado clínico.

**Recomendação para a revisão jurídica:** reescrever o controlo da secção 7
para dizer o que sempre quis dizer — *"a gravidade nunca é calculada a partir
de dados clínicos da criança"* — e acrescentar um controlo separado para as
referências populacionais: *"a comparação com uma referência publicada é
permitida; produzir a partir dela uma pontuação, um nível ou uma condição não
é."* Isto já está feito no ficheiro 01.

---

## 3. O que foi deliberadamente **não** construído

A proposta nº 8 do roadmap chama-se "módulo de desenvolvimento/**saúde
mental**". A metade da saúde mental, tal como a indústria a faz, é um
instrumento com pontuação. Nenhum foi construído, e a razão é a mesma para
todos:

| Instrumento | O que produz | Consequência |
|---|---|---|
| **M-CHAT-R/F** (rastreio de autismo, 16–30 meses) | Pontuação 0–20 com pontos de corte de risco baixo/médio/alto e uma entrevista de seguimento | Rastreio de uma condição específica → MDR Regra 11, provável Classe IIa |
| **ASQ-3** (rastreio de desenvolvimento) | Pontuação por domínio contra um ponto de corte | Idem |
| **SDQ** (dificuldades e capacidades, 4–17 anos) | Pontuação total e por subescala, com bandas | Idem |
| **EPDS** (depressão pós-parto) | Pontuação 0–30 com corte, incluindo um item de ideação suicida | Idem, e cria um dever de resposta a uma resposta de risco que a plataforma não tem como cumprir |

**Construir qualquer um destes é entrar no MDR de propósito.** Não é uma
decisão de engenharia; é a decisão nº 4 do conselho ao contrário, com
marcação CE, sistema de gestão da qualidade, avaliação clínica e organismo
notificado atrás dela — 12 a 24 meses, que é exactamente o desvio que a
decisão nº 4 existe para evitar.

Isto não é um "não" definitivo. É um "não por acidente". A via DiGA/PECAN
(proposta nº 9) exige marcação CE de qualquer forma; se essa via for escolhida,
o M-CHAT-R passa a ser uma peça óbvia do produto e não um risco. As duas
decisões devem ser tomadas juntas, e por quem pode assiná-las.

### 3.1 O que se fez na metade da saúde mental, sem instrumento

- **O domínio social e emocional** está no catálogo como os outros três, em
  todas as bandas etárias. É desenvolvimento socio-emocional registado, que é o
  que a evidência para 0–6 anos suporta.
- **Uma especialidade nova no marketplace**, `development` — "Desenvolvimento e
  comportamento". A lista terminava em "fala com o pediatra" e não havia
  ninguém cujo perfil dissesse que esse era o assunto dele.
- **Encaminhamento por sintoma**: "ainda não fala", "faz birras", "está muito
  ansioso", "problemas de comportamento" passam a apontar para essa
  especialidade. Antes caíam em neurologia ou em lado nenhum. Encaminhar é
  navegação comercial — dizer que **tipo de profissional** procurar — e não uma
  afirmação sobre a criança.

---

## 4. Decisões de desenho que reduzem dano

- **Uma banda só conta como passada quando a criança já passou a banda
  SEGUINTE.** Os marcos dos CDC estão no nível que ~75% das crianças atingem
  àquela idade: uma em cada quatro famílias não teria o marco assinalado no
  próprio dia. Prompt nesse momento seria preocupar um quarto das famílias sem
  motivo. Esperar uma banda inteira troca alguma sensibilidade por muitos menos
  alarmes falsos — a troca certa para uma coisa que um pai lê sozinho, à noite.
- **A última banda nunca fica "em atraso"**, porque não há banda seguinte. Sem
  isto, uma criança de cinco anos ficaria a ver o mesmo aviso para sempre.
- **Desmarcar é normal.** Um pai marca a linha errada e corrige. Não há
  penalização, nem histórico de "desmarcações".
- **Os códigos do catálogo são estáveis e numerados por domínio.** O código é a
  chave escrita na ficha clínica; renumerar um faria as linhas existentes
  apontar para outro marco.
- **A nota do pai é cifrada** (AES-256-GCM); o código do marco fica em claro,
  como os outros campos codificados do registo (ICD-10, ATC, CVX).

---

## 5. Na exportação FHIR

Cada marco assinalado sai como um `Observation` de categoria **`survey`** (não
`vital-signs`: veio de um pai a responder a uma lista, não de uma medição), com
`valueBoolean: true`, a data e o código do catálogo no nosso namespace
`urn:pedia:milestone`. **Não é afirmado nenhum LOINC** — os marcos dos CDC não
têm código que possuamos, e inventar um seria a mesma falha que o ficheiro
`fhir.ts` existe para evitar.

Um sistema recetor tem de tratar a ausência de `Observation` como "não
registado", nunca como "não atingido". Está dito em
`compliance/02-exportacao-fhir.md` § 4 e no comentário do próprio mapeamento.

---

## 6. O que obrigaria a reavaliar

- Somar, contar ou classificar os marcos por assinalar, de qualquer forma.
- Mostrar um nível, uma cor de gravidade ou um limiar.
- Nomear uma condição, mesmo como possibilidade.
- Implementar M-CHAT-R, ASQ-3, SDQ, EPDS ou equivalente.
- Deixar um modelo de linguagem interpretar os marcos por assinalar.
- Fazer o produto agir sozinho sobre a lista (marcar consulta automaticamente,
  notificar um pediatra) — deixaria de ser informação para o pai e passaria a
  ser uma decisão do software.

---

## 7. Fontes

- Zubler JM et al., *Evidence-Informed Milestones for Developmental
  Surveillance Tools*, Pediatrics, 2022 — a revisão de 2022 dos marcos dos CDC
  "Learn the Signs. Act Early." (obra do governo federal dos EUA, domínio
  público).
- MDCG 2019-11 — orientação de qualificação e classificação de software.
- Regulamento (UE) 2017/745 (MDR), Anexo VIII, Regra 11.
- `docs/compliance/01-qualificacao-regulatoria.md` — a análise-mãe.

*Última atualização: 2026-09-09.*
