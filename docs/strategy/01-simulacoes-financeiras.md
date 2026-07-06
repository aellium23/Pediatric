# 01 · Simulações Financeiras — Adoção em Portugal (HOC)

> **Objetivo**: responder à pergunta "se aderirem X famílias/mês e fizerem Y consultas, quanto fatura a HOC em comissões e quanto custa a aplicação?" com três cenários de crescimento a 36 meses e P&L comparativo.
>
> **Método**: todos os valores foram calculados por um script determinístico (Node.js, guardado fora do repo, no scratchpad da sessão: `sim-hoc.js`) — nenhuma tabela foi feita à mão. Preços, comissões e custos vêm dos documentos do plano de negócio ([doc 02](../02-problema-oportunidade.md), [doc 05](../05-modelo-negocio.md), [doc 11](../11-fluxos-pagamento.md), [doc 12](../12-faturacao-portugal.md), [doc 15](../15-roadmap.md)). Onde os docs dão faixas, escolhemos um ponto e declaramo-lo.
>
> ⚠️ Isto é um **modelo de simulação**, não uma previsão. Os pressupostos de adesão são hipóteses a validar com dados reais do painel Mercado da app (ver secção "Limites do modelo").

---

## 1. Sumário executivo

| Números-chave (36 meses) | A — Conservador | B — Base | C — Otimista |
|---|---:|---:|---:|
| **Break-even (EBITDA mensal > 0)** | Não atingido (>M36) | Não atingido (>M36) | **Mês 29** |
| **Receita HOC Ano 3** | ~43,5 k€ | ~342 k€ | ~2 704 k€ |
| **EBITDA Ano 3** | −349 k€ | −340 k€ | **+166 k€** (margem 6%) |
| **Necessidade máx. de financiamento** | ~860 k€ (M36, a crescer) | ~863 k€ (M36, a estabilizar) | ~501 k€ (pico no M28) |
| **LTV/CAC** | 1,8x | 4,4x | 9,1x |
| Famílias ativas no M36 | ~2 700 | ~17 800 | ~125 700 |
| GMV Ano 3 | ~220 k€ | ~1 820 k€ | ~14 400 k€ |

**Três conclusões do modelo:**

1. **A economia unitária funciona** — cada consulta deixa ~3,9 € de margem de contribuição à HOC (comissão 4,7 € menos PSP e faturação ~0,8 €), e o LTV/CAC é saudável nos cenários B e C. O problema não é a margem por transação: é o **volume necessário para cobrir a equipa**.
2. **A estrutura de custos fixos (equipa) exige escala**. Com ~2,4 € de receita HOC por família ativa/mês (cenário Base), são precisas **~8–10 mil famílias ativas só para pagar a equipa da fase 3** (~24 k€/mês com overhead). O cenário A nunca lá chega em 36 meses; o B chega perto do equilíbrio operacional no fim do Ano 3 se abrandar o investimento em aquisição; o C atinge break-even no M29.
3. **A necessidade de financiamento situa-se entre ~500 k€ e ~870 k€** consoante o cenário — paradoxalmente, o cenário otimista precisa de *menos* caixa porque a receita cobre os custos mais cedo. Um plano de financiamento prudente deve assumir **~900 k€ para 36 meses de pista** (ou uma equipa mais magra que a modelada — ver secção 8).

---

## 2. Enquadramento de mercado (doc 02)

- Portugal: **~1,3–1,5 M crianças 0–14 anos** (doc 02; valores ilustrativos, a validar com INE/PORDATA).
- **TAM**: ~800 k–1 M famílias dispostas a pagar telepediatria privada. Nota: a estimativa complementar de ~850 k famílias com crianças usada como sanity check é **estimativa nossa**, coerente com a faixa do doc 02.
- **SAM**: ~150 k–250 k famílias urbanas, digitais, filhos 0–6, early-adopters.
- **SOM (ano 1–2)**: ~5 k–20 k famílias ativas.

**Sanity check dos cenários face ao mercado**: o cenário B termina o M36 com ~17,8 k famílias ativas — dentro do SOM do doc 02 e ~7–12% do SAM. O cenário C termina com ~125,7 k famílias (~50–84% do SAM) — é um teto agressivo que assume execução quase perfeita e provavelmente já exigiria expansão além do segmento early-adopter; deve ser lido como "limite superior", não como plano.

---

## 3. Pressupostos

### 3.1 Preços e mix de consultas (doc 05)

| Tipo | Preço usado | Faixa do doc 05 | Peso no mix |
|---|---:|---:|---:|
| Mensagem | 18 € | 10–25 € | 70% |
| Videochamada | 40 € | 30–60 € | 25% |
| Outros (2ª opinião, pacotes) | 60 € | 40–90 € | 5% |
| **Ticket médio ponderado** | **25,60 €** | — | 100% |

### 3.2 Receita da HOC (doc 05)

- **Comissão padrão (Free): 20%** do valor da consulta (recomendação de partida do doc 05).
- **Plano Pro de pediatra** (doc 05 define-o, por isso incluímo-lo): **29 €/mês** (faixa 19–49 €) com **comissão reduzida para 14%** (faixa 12–15%). Pressupostos: 25% dos pediatras aderem ao Pro e geram 25% do GMV.
- **Take rate blended resultante: 18,5%** (75% do GMV a 20% + 25% a 14%) → **4,74 € de comissão por consulta média** + subscrições Pro. Se ninguém aderisse ao Pro (20% flat), a receita de comissões seria ~8% superior — mas perder-se-iam as subscrições; o efeito líquido é pequeno.
- Nº de pediatras ativos: mínimo 30 (GTM supply-led do doc 05) e 1 por cada ~100 consultas/mês a partir daí.
- **Não modelado (upside)**: subscrição familiar (7,99–14,99 €/mês, Fase 3 do roadmap), fee fixo híbrido (+0,30 €), destaque pago, B2B clínicas/seguradoras.

### 3.3 Custos variáveis (docs 11 e 12)

| Rubrica | Valor | Fonte/nota |
|---|---|---|
| PSP (Stripe Connect EU) | 1,4% do GMV + 0,25 €/transação | Doc 11 (~1,5% intra-EU); ≈ 0,61 €/consulta média |
| Faturação certificada | 0,10 €/documento × 2 docs/consulta = 0,20 €/consulta | Doc 12: 2 documentos por consulta (fatura do ato médico + fatura da comissão), 0,05–0,15 €/doc |

### 3.4 Custos fixos e semi-fixos (mensais, custo empresa)

| Rubrica | Valor | Nota |
|---|---|---|
| Infra (Render/Vercel/Postgres/S3) | 200 € → 500 € (>2 k consultas/mês) → 1 500 € (>10 k) | Degraus |
| Equipa — Fase 1 (M1–6) | 9 500 € | 2 fundadores × 3 000 € + 1 dev 3 500 € |
| Equipa — Fase 2 (M7–18) | 16 700 € | + 1 dev 3 500 € + suporte/ops 2 200 € + clinical lead part-time 1 500 € |
| Equipa — Fase 3 (M19–36) | 21 700 € | + 1 dev 2 500 € + 1 marketing 2 500 € |
| Marketing — aquisição | CAC × famílias novas: 25 € (A), 18 € (B), 14 € (C) | CAC por família adquirida |
| Marketing — branding | 500 € → 1 000 € → 2 000 € | Acompanha as fases da equipa |
| Legal/compliance/seguros | 800 € + 200 € RC profissional = 1 000 € | RC é estimativa nossa |
| Overhead | +10% sobre todos os custos operacionais | Contabilidade, ferramentas, imprevistos |

> **Nota cenário C**: por crescer mais depressa, a equipa e o branding escalam mais cedo — Fase 2 a partir do **M5** e Fase 3 a partir do **M13** (em vez de M7/M19).

### 3.5 Drivers de adoção por cenário (hipóteses a validar)

| Driver (mensal) | A — Conservador | B — Base | C — Otimista |
|---|---:|---:|---:|
| Famílias novas no arranque | 40/mês | 120/mês | 300/mês |
| Crescimento das novas adesões | +5%/mês | +8%/mês | +12%/mês |
| Consultas por família ativa | 0,35/mês | 0,50/mês | 0,65/mês |
| Churn de famílias | 3%/mês | 2,5%/mês | 2%/mês |
| CAC | 25 € | 18 € | 14 € |

Mecânica: `famílias ativas(m) = ativas(m−1) × (1 − churn) + novas(m)`; `consultas = ativas × frequência`; `GMV = consultas × 25,60 €`.

---

## 4. Cenário A — Conservador

*40 famílias novas/mês a crescer 5%/mês, 0,35 consultas/família/mês, churn 3%.*

| Período | Famílias ativas | Consultas/mês (fim) | GMV | Receita HOC | Custos | EBITDA | Margem |
|---|---:|---:|---:|---:|---:|---:|---:|
| T1 (M1–3) | 122 | 43 | 2 180 € | 1 099 € | 40,5 k€ | −39,4 k€ | — |
| T2 (M4–6) | 254 | 89 | 5 622 € | 1 736 € | 41,2 k€ | −39,4 k€ | — |
| T3 (M7–9) | 396 | 138 | 9 336 € | 2 423 € | 67,3 k€ | −64,9 k€ | — |
| T4 (M10–12) | 551 | 193 | 13,4 k€ | 3 173 € | 68,2 k€ | −65,0 k€ | — |
| Ano 2 (M13–24) | 1 372 | 480 | 104 k€ | 22,0 k€ | 324 k€ | −302 k€ | −1375% |
| Ano 3 (M25–36) | 2 729 | 955 | 220 k€ | 43,5 k€ | 393 k€ | −349 k€ | −803% |

- **Break-even**: não atingido em 36 meses. **Cash acumulado M36**: −860 k€ e ainda a degradar-se.
- **LTV/CAC = 1,8x** (LTV ≈ 46 €/família) — abaixo do alvo de 3x do doc 05.
- **Leitura**: com esta tração o negócio **não sustenta a equipa modelada**. Se o mercado responder assim, as opções são (a) equipa mínima (só fundadores) até haver sinal, (b) subir frequência/ticket via subscrição familiar, ou (c) pivô do GTM. É o cenário que define o critério de *stop-loss*.

## 5. Cenário B — Base

*120 famílias novas/mês a crescer 8%/mês, 0,5 consultas/família/mês, churn 2,5%.*

| Período | Famílias ativas | Consultas/mês (fim) | GMV | Receita HOC | Custos | EBITDA | Margem |
|---|---:|---:|---:|---:|---:|---:|---:|
| T1 (M1–3) | 380 | 190 | 9 562 € | 2 465 € | 45,0 k€ | −42,5 k€ | — |
| T2 (M4–6) | 832 | 416 | 25,9 k€ | 5 494 € | 47,6 k€ | −42,1 k€ | — |
| T3 (M7–9) | 1 375 | 687 | 45,5 k€ | 9 121 € | 76,2 k€ | −67,1 k€ | — |
| T4 (M10–12) | 2 034 | 1 017 | 69,3 k€ | 13,5 k€ | 80,2 k€ | −66,7 k€ | — |
| Ano 2 (M13–24) | 6 625 | 3 312 | 645 k€ | 122 k€ | 427 k€ | −305 k€ | −250% |
| Ano 3 (M25–36) | 17 790 | 8 895 | 1 820 k€ | 342 k€ | 682 k€ | −340 k€ | −99% |

- **Break-even**: não atingido em 36 meses **enquanto se mantiver o ritmo de aquisição** — no M36 a HOC fatura ~43 k€/mês mas gasta ~35 k€/mês só em CAC (1 800 famílias novas × 18 € + overhead). **Cash acumulado M36**: −863 k€, já quase estabilizado (o burn mensal cai de ~67 k€ no T4 para ~28 k€ no fim do Ano 3).
- **LTV/CAC = 4,4x** (LTV ≈ 79 €) — saudável; o payback do CAC é ~9 meses. As perdas do Ano 3 são sobretudo **investimento em aquisição com retorno positivo**, não destruição de valor.
- **Leitura**: o cenário Base atinge o equilíbrio operacional pouco depois do M36 (ou dentro do Ano 3, se abrandar a aquisição). É o cenário de planeamento recomendado, com ~900 k€ de pista.

## 6. Cenário C — Otimista

*300 famílias novas/mês a crescer 12%/mês, 0,65 consultas/família/mês, churn 2%. Equipa escala mais cedo (Fase 2 no M5, Fase 3 no M13).*

| Período | Famílias ativas | Consultas/mês (fim) | GMV | Receita HOC | Custos | EBITDA | Margem |
|---|---:|---:|---:|---:|---:|---:|---:|
| T1 (M1–3) | 994 | 646 | 32,0 k€ | 6 618 € | 53,7 k€ | −47,0 k€ | — |
| T2 (M4–6) | 2 331 | 1 515 | 92,6 k€ | 17,8 k€ | 79,0 k€ | −61,2 k€ | — |
| T3 (M7–9) | 4 156 | 2 701 | 175 k€ | 33,1 k€ | 99,9 k€ | −66,8 k€ | — |
| T4 (M10–12) | 6 667 | 4 334 | 288 k€ | 54,1 k€ | 117 k€ | −62,5 k€ | — |
| Ano 2 (M13–24) | 31 206 | 20 284 | 3 460 k€ | 650 k€ | 894 k€ | −244 k€ | −38% |
| Ano 3 (M25–36) | 125 684 | 81 694 | 14 397 k€ | 2 704 k€ | 2 538 k€ | **+166 k€** | **6%** |

- **Break-even: M29**. **Pico de necessidade de caixa: ~501 k€ no M28**; no M36 o cash acumulado já recuperou para −315 k€.
- **LTV/CAC = 9,1x** (LTV ≈ 128 €).
- **Leitura**: valida a tese "marketplace com margem por transação pequena mas escala grande". Atenção: no M36 implica ~82 k consultas/mês e ~820 pediatras ativos — a restrição passa a ser **oferta (recrutamento de pediatras)**, não procura.

---

## 7. Sensibilidade — "e se aderirem X famílias/mês?"

Regime estacionário no 12º mês: X famílias novas por mês **constantes** (sem crescimento), churn 2,5%/mês, 0,5 consultas/família/mês, ticket 25,60 €, take blended 18,5% (pressupostos do cenário Base).

| Famílias novas/mês | Famílias ativas (M12) | Consultas/mês | GMV/mês | Comissão HOC/mês |
|---:|---:|---:|---:|---:|
| 50 | 524 | 262 | 6 707 € | 1 241 € |
| 100 | 1 048 | 524 | 13,4 k€ | 2 482 € |
| 250 | 2 620 | 1 310 | 33,5 k€ | 6 204 € |
| 500 | 5 240 | 2 620 | 67,1 k€ | 12,4 k€ |
| 1 000 | 10 480 | 5 240 | 134 k€ | 24,8 k€ |

**Regra de bolso**: cada família ativa vale **~2,4 €/mês de receita HOC** (0,5 consultas × 4,74 €). Para cobrir a equipa de Fase 2 com overhead (~20 k€/mês) são precisas **~8 500 famílias ativas** — ou seja, ~800–850 adesões novas/mês sustentadas. Este é o número que o painel Mercado da app deve monitorizar contra a realidade.

---

## 8. P&L comparativo (3 anos × 3 cenários)

| Rubrica | A Ano1 | A Ano2 | A Ano3 | B Ano1 | B Ano2 | B Ano3 | C Ano1 | C Ano2 | C Ano3 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| GMV | 30,5 k€ | 104 k€ | 220 k€ | 150 k€ | 645 k€ | 1 820 k€ | 588 k€ | 3 460 k€ | 14 397 k€ |
| Receita HOC | 8,4 k€ | 22,0 k€ | 43,5 k€ | 30,6 k€ | 122 k€ | 342 k€ | 112 k€ | 650 k€ | 2 704 k€ |
| Custos totais | 217 k€ | 324 k€ | 393 k€ | 249 k€ | 427 k€ | 682 k€ | 349 k€ | 894 k€ | 2 538 k€ |
| **EBITDA** | **−209 k€** | **−302 k€** | **−349 k€** | **−218 k€** | **−305 k€** | **−340 k€** | **−238 k€** | **−244 k€** | **+166 k€** |
| Margem EBITDA | — | — | — | — | −250% | −99% | −213% | −38% | **6%** |

### Break-even e financiamento

| | A | B | C |
|---|---:|---:|---:|
| Mês de break-even (EBITDA) | >M36 | >M36 (≈ Ano 4, ou antes abrandando CAC) | **M29** |
| Necessidade máx. de financiamento | 860 k€ (M36) | 863 k€ (M36) | 501 k€ (M28) |
| LTV família / CAC | 46 € / 25 € = 1,8x | 79 € / 18 € = 4,4x | 128 € / 14 € = 9,1x |

**Implicação de planeamento**: em qualquer cenário, o Ano 1 queima ~210–240 k€ — a diferença entre cenários só se torna material a partir do Ano 2. Duas alavancas dominam o modelo: (1) **custo da equipa** — se os fundadores adiarem salário ou a Fase 2 contratar mais tarde, a necessidade de caixa cai 100–200 k€; (2) **frequência de consultas por família** — passar de 0,5 para 0,65 consultas/mês (ex.: via subscrição familiar) aumenta a receita ~30% sem CAC adicional.

---

## 9. Limites do modelo (o que NÃO está aqui)

Este modelo é deliberadamente simples. Não modela:

- **IVA sobre a comissão (23%)**: a comissão da HOC é serviço de intermediação sujeito a IVA (doc 12). As receitas acima são **sem IVA** (o IVA é neutro se cobrado ao pediatra, mas afeta o preço percebido); a decisão fiscal final (Modelo A de faturação) ainda tem de ser validada por fiscalista.
- **Impostos sobre lucros (IRC)**, subsídios, incentivos (ex.: Startup Portugal) — o P&L é pré-imposto.
- **Incumprimento, chargebacks e reembolsos por SLA falhado** (doc 11) — assumimos 100% de consultas cobradas com sucesso.
- **Sazonalidade** — a pediatria tem picos (inverno/viroses, arranque escolar) e vales (verão); os números mensais reais oscilarão em torno das médias.
- **Preço dinâmico e dispersão de preços por pediatra** — o preço é definido pelo pediatra (doc 05); usamos pontos fixos dentro das faixas.
- **Subscrição familiar, fee híbrido (+0,30 €), destaque pago e B2B** — upside não contabilizado (Fase 3 do roadmap).
- **Restrição de oferta** — o modelo assume que há sempre pediatras suficientes; no cenário C isso implica recrutar ~800 pediatras em 3 anos, o que é em si um desafio de GTM.
- **Working capital e timing de payouts** (escrow, calendário de payout do PSP) — o cash acumulado é a soma simples do EBITDA.

**Sobretudo**: as taxas de adesão (40/120/300 famílias/mês), a frequência (0,35–0,65 consultas/família/mês) e o churn (2–3%/mês) são **hipóteses, não dados**. Devem ser confrontadas mês a mês com os dados reais do painel Mercado que já existe na app — famílias registadas, famílias ativas, consultas por família, retenção por coorte — e o modelo recalibrado ao fim dos primeiros 3–6 meses de operação real. O script de cálculo está no scratchpad da sessão (`sim-hoc.js`) e qualquer pressuposto pode ser alterado numa linha e as tabelas regeneradas.

---

*Documento gerado em 2026-07-06. Fontes: docs 02, 05, 11, 12 e 15 do plano de negócio HOC/Pédia. Valores em €, sem IVA, pré-imposto.*
