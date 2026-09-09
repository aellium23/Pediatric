# 04 · DiGA e PECAN — decidir em vez de adiar

> Data: 2026-09-09 · Empresa: DES · Produto: HOC / Pédia
> **Estado: proposta de decisão, por assinar.** A recomendação é da engenharia;
> a decisão é dos fundadores, e a secção 9 é onde se assina.
>
> **Aviso:** as datas e os instrumentos legais citados são factuais. Os custos,
> prazos e preços são **ordens de grandeza** e estão marcados como tal — nenhum
> substitui um orçamento pedido a quem faz este trabalho.

---

## 1. Porque este documento existe

A proposta nº 9 da revisão de mercado não é "construir DiGA". É **decidir**. A
via do reembolso público apareceu na revisão como a única fonte de receita que
não depende do bolso da família, e **não estava em lado nenhum do roadmap** —
nem como sim, nem como não.

Uma decisão que não é tomada é tomada na mesma, por omissão, e normalmente da
pior maneira: descobre-se dois anos depois que a arquitetura, as declarações de
finalidade prevista e os textos de marketing fecharam a porta sem ninguém ter
escolhido fechá-la. Este documento existe para que o "não" — se for não — seja
uma escolha datada, com condições escritas para a reabrir.

---

## 2. O que a decisão é realmente

Formulada corretamente, não é *"queremos ser reembolsados?"* (a resposta a essa
é obviamente sim). É:

> **Queremos tornar-nos fabricante de dispositivos médicos, construir um
> produto terapêutico diferente do atual, e entrar na Alemanha ou em França,
> antes de o piloto português dizer se a tese base funciona?**

Três compromissos, não um. Cada um sozinho seria uma decisão grande.

---

## 3. O que são, factualmente

### 3.1 DiGA (Alemanha)

| | |
|---|---|
| Base legal | *Digitale-Versorgung-Gesetz* (DVG), dezembro de 2019; alargado pelo *Digital-Gesetz* (DigiG, 2024) |
| Quem gere | BfArM (autoridade federal do medicamento e dispositivos), que mantém o *DiGA-Verzeichnis* |
| Quem paga | Seguro obrigatório de saúde (GKV) — cobre a larguíssima maioria da população alemã |
| Requisito de base | Ser **dispositivo médico com marcação CE**, classe I ou IIa (o DigiG abriu a IIb em certos casos) |
| Requisito clínico | Demonstrar *positive Versorgungseffekte* — benefício médico **ou** melhoria estrutural/processual relevante para o doente |
| Via rápida | Inscrição **provisória** (*Erprobung*) até 12 meses, prorrogável, enquanto decorre o estudo; BfArM decide em ~3 meses |
| Requisitos adicionais | Proteção de dados reforçada, segurança da informação (certificação), interoperabilidade |
| Preço | Fixado pelo fabricante no 1.º ano, depois negociado com a GKV-Spitzenverband — com pressão descendente e tetos introduzidos desde a criação do regime |

### 3.2 PECAN (França)

| | |
|---|---|
| Base legal | Artigo 54.º da LFSS 2022, operacional desde 2023 |
| O que é | *Prise en charge anticipée* — reembolso antecipado, até 12 meses, de dispositivos médicos digitais de **telemonitorização** ou **terapêuticos** |
| Requisitos | Marcação CE + certificação de interoperabilidade e segurança pela ANS |
| Depois | Para reembolso permanente, avaliação pela CNEDiMTS/HAS e inscrição na LPPR |

### 3.3 Portugal

**Não existe equivalente.** Não há via de reembolso público para aplicações de
saúde digital. Isto é o facto mais consequente das três tabelas e é fácil de
não ver: seguir DiGA ou PECAN **não é abrir um canal de receita no nosso
mercado** — é entrar noutro país.

---

## 4. A constatação que decide quase tudo

**O HOC, como existe hoje, não é elegível para DiGA — não por falhar um
requisito, mas por ser de outra espécie.**

O DiGA reembolsa uma **intervenção digital com uma indicação clínica** e um
efeito demonstrado no cuidado: um programa para insónia, um para lombalgia, um
para ansiedade. O que o HOC é hoje é (a) um registo de saúde da criança e (b)
um marketplace de pediatras. Nenhum dos dois é uma intervenção com indicação:

- **O registo** guarda e mostra. É precisamente o que os documentos
  `compliance/01` e `03` argumentam que *não* age sobre dados — e esse
  argumento é a base da decisão nº 4 do conselho.
- **O marketplace** intermedeia consultas. Teleconsulta na Alemanha é paga
  pelas tabelas médicas normais, não como DiGA.

Portanto a via DiGA **não é "acrescentar um canal ao produto atual"**. É
construir um produto novo, mais estreito, com uma indicação, e submetê-lo. Na
prática: uma segunda empresa dentro da empresa.

O mesmo raciocínio se aplica ao PECAN, cujas duas categorias — telemonitorização
e terapêutica — também não descrevem um registo nem um marketplace.

---

## 5. O que custaria, em ordem de grandeza

Para levar **um** produto terapêutico ao *DiGA-Verzeichnis*, a partir de onde
estamos:

| Peça | Ordem de grandeza |
|---|---|
| Sistema de gestão da qualidade (ISO 13485) e documentação técnica | 6–12 meses, dezenas de milhares de euros, mais uma função a tempo inteiro |
| Marcação CE classe IIa (organismo notificado) | 6–12 meses adicionais, com filas de organismos notificados que continuam longas |
| Avaliação clínica / estudo de efeitos positivos | O item mais caro e mais lento; em pediatria, mais ainda |
| Dossiê BfArM, segurança, interoperabilidade | Meses, e trabalho contínuo depois |
| Entrada no mercado alemão | Entidade, língua, clínicos, relação com pagadores |
| **Total realista** | **12–24 meses e um investimento que, para uma empresa que ainda não lançou o piloto, é a empresa inteira** |

E, do outro lado da conta: o reembolso por DiGA tem estado sob **pressão de
preço** desde a criação do regime, e os volumes de prescrição têm ficado
consistentemente abaixo do que as projeções iniciais do setor sugeriam. É um
canal real; não é um canal fácil.

> Nenhum destes números é um orçamento. São a ordem de grandeza que se usa para
> decidir se vale a pena pedir orçamentos — e, neste momento, a resposta a essa
> pergunta menor também é não.

### 5.1 O caso pediátrico, dos dois lados

O diretório alemão é **fino em pediatria**. Isso lê-se de duas maneiras
opostas e ambas são verdade:

- **Oportunidade:** pouca concorrência, e uma necessidade real — a
  saúde mental e o desenvolvimento infantil são a área de maior crescimento em
  telessaúde infantil (revisão de mercado, §1).
- **Aviso:** o diretório é fino em pediatria porque **é mais difícil**. Ensaios
  com crianças têm aprovação ética mais exigente, recrutamento mais lento,
  consentimento por representante e desfechos mais difíceis de medir. A
  ausência de concorrentes não é um vazio à espera; é um custo que outros já
  calcularam.

---

## 6. Recomendação: **não agora** — e com data para reabrir

Cinco razões, por ordem de peso:

1. **A tese base ainda não foi testada.** O piloto não arrancou. Não há um único
   dado que diga se as famílias voltam à app quando ninguém está doente, que é
   a premissa de que tudo depende. Comprometer 12–24 meses de regulação com uma
   tese por confirmar é apostar a empresa numa suposição.
2. **O produto atual não é elegível por natureza**, não por detalhe (§4).
   Seguir esta via é construir outro produto, não melhorar este.
3. **É simultaneamente uma decisão de entrada em mercado** que ninguém tomou. O
   piloto é em Portugal, em português (`PRODUCT_DECISIONS` §7). Alemanha e
   França são outra empresa, outra língua, outros clínicos, outros pagadores.
4. **Contradiz de frente a decisão nº 4 do conselho**, que foi ficar fora do
   MDR de propósito para evitar 12–24 meses de desvio. Inverter uma decisão
   deliberada exige um facto novo, e não há nenhum — só uma oportunidade que
   também existia quando ela foi tomada.
5. **O custo de esperar é baixo; o de errar é a empresa.** DiGA e PECAN não vão
   desaparecer. O que se perde ao esperar é tempo de mercado num canal que não
   é o nosso mercado.

**Isto é um "não agora", não um "não".** A diferença é operacional e está na
secção 7.

---

## 7. Manter a opção viva, ao custo de zero

O que é barato hoje e caro depois — e, quase tudo, já está feito:

- [x] **Registo estruturado e exportável** — Bundle FHIR R4 (`compliance/02`).
      Um dossiê de avaliação clínica assenta em dados que se conseguem extrair;
      um registo fechado torna qualquer estudo futuro num projeto de migração.
- [x] **Campos codificados** — ICD-10, ICPC-2, ATC, CVX já no modelo. Sem
      codificação não há desfechos mensuráveis.
- [x] **Rasto documental do raciocínio regulatório** — `compliance/01`, `02` e
      `03`. É o embrião da documentação técnica que um organismo notificado
      pede, e escrever isto retroativamente é arqueologia.
- [x] **Não construir instrumentos de rastreio por acidente** — M-CHAT-R,
      ASQ-3, SDQ e EPDS estão explicitamente fora (`compliance/03` §3). Uma
      pontuação construída sem intenção põe-nos no MDR sem nenhum dos
      benefícios de lá estar.
- [ ] **Não fechar a porta na linguagem.** A finalidade prevista publicada
      (`compliance/01` §2) diz o que o produto **não** faz. Isso é correto e
      deve manter-se — mas note-se que é uma declaração sobre *este* produto.
      Um produto terapêutico futuro teria a sua própria finalidade prevista, e
      isso não é uma contradição desde que sejam produtos distintos e
      declarados como tal.
- [ ] **Vigiar o espaço, um dia por semestre.** Em concreto: alterações ao
      regime DiGA (preço e classes), evolução do PECAN para reembolso
      permanente, e qualquer sinal de que Portugal ou a UE criam uma via
      equivalente.

---

## 8. O que reabre esta decisão

Qualquer um destes é um facto novo e obriga a reavaliar — não a inverter
automaticamente, mas a voltar a esta página:

1. **O piloto confirma a tese** (hábito semanal + retenção) **e** revela um
   problema clínico concreto que as famílias pedem repetidamente como programa
   estruturado — sono, ansiedade, adesão à terapêutica da asma. Aí há uma
   indicação candidata em vez de uma ideia.
2. **Alguém financia o ensaio** — um pagador, um parceiro industrial, um
   programa público (EIC, EU4Health). O custo que hoje bloqueia deixa de ser
   nosso.
3. **Portugal cria uma via de reembolso**, ou a UE harmoniza uma. Aí o canal
   passa a ser no nosso mercado e a decisão de entrada de mercado desaparece
   da equação.
4. **A receita do bolso da família estagna** e o constrangimento passa a ser a
   capacidade de pagar, não a de adquirir.
5. **A decisão sobre um instrumento de rastreio** (`compliance/03` §3) é
   tomada em sentido afirmativo — porque essa exige marcação CE de qualquer
   forma, e nesse caso o custo marginal do DiGA cai muito. **As duas decisões
   são a mesma decisão vista de dois lados e devem ser tomadas na mesma
   reunião.**

---

## 9. Assinaturas

Marcar **uma** opção. A ausência de assinatura mantém em vigor a recomendação
da secção 6.

- [ ] **A — Não agora, com revisão a 12 meses** *(recomendado)*. Manter fora do
      MDR; manter as alíneas da secção 7; reavaliar em setembro de 2027 ou
      quando ocorrer um gatilho da secção 8.
- [ ] **B — Não, definitivamente.** Encerrar a via e deixar de vigiar o espaço.
      (Não recomendado: fecha uma porta sem ganhar nada com isso.)
- [ ] **C — Sim, começar agora.** Implica decidir na mesma sessão qual a
      indicação clínica, qual o mercado de entrada, e de onde vem o
      financiamento do ensaio. Sem essas três respostas, "sim" não é uma
      decisão — é uma intenção.

| Papel | Nome | Data | Opção |
|---|---|---|---|
| Fundador(a) / DES | | | |
| Aconselhamento regulatório | | | |

---

## 10. Fontes

- *Digitale-Versorgung-Gesetz* (DVG, 2019) e *Digital-Gesetz* (DigiG, 2024),
  Alemanha; DiGA-Verzeichnis do BfArM.
- LFSS 2022, artigo 54.º (PECAN), França; ANS para certificação de
  interoperabilidade e segurança; HAS/CNEDiMTS para o reembolso permanente.
- Regulamento (UE) 2017/745 (MDR) e MDCG 2019-11.
- `docs/strategy/00-child-health-os-relatorio-conselho.md` — decisão nº 4.
- `docs/strategy/03-revisao-mercado-roadmap.md` §1 e §3 — de onde vem esta
  proposta.
- `docs/compliance/01`, `02` e `03` — qualificação, exportação e marcos.

*Última atualização: 2026-09-09.*
