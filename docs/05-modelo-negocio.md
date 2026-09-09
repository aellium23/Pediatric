# 05 · Modelo de Negócio

> **Precedência — âncora de receita substituída.** O modelo abaixo põe a
> **comissão** de marketplace como núcleo e a subscrição como complemento. O
> relatório do conselho inverteu isso: a receita é ancorada na **subscrição
> Family Premium**, com a comissão, o SaaS de clínicas e o B2B a compor por
> cima. Ver [`strategy/00-child-health-os-relatorio-conselho.md`](strategy/00-child-health-os-relatorio-conselho.md)
> §3 e §22, e o [índice de precedência](README.md).
>
> Tudo o resto aqui — tipos de consulta, matriz de pricing, unit economics,
> benchmark de comissões, riscos do modelo — continua a ser a referência.

## Visão geral

Marketplace de dois lados (pais ↔ pediatras) com monetização **transacional** (comissão) + **recorrente** (subscrições) + **B2B** (clínicas/seguradoras).

## Fontes de receita

### 1. Comissão por consulta (núcleo)
- Percentagem sobre o valor cobrado por consulta paga.
- **Sugestão de partida: 15–25%** (a calibrar; ver benchmark abaixo).
- Configurável por: **pediatra**, **país**, **tipo de consulta** e **plano**.

### 2. Fee fixo por transação (opcional/híbrido)
- Componente fixa (ex.: 0,30–0,50 €) para cobrir custo de processamento em tickets baixos.

### 3. Modelo híbrido
- Ex.: 18% + 0,30 €, ou comissão menor para quem está num plano mensal.

### 4. Subscrição familiar (recorrente, lado da procura)
- Mensalidade (ex.: 7,99–14,99 €/mês) com pacote de mensagens incluídas, descontos em vídeo, prioridade de SLA, multi-criança.
- Aumenta LTV e previsibilidade.

### 5. Plano de pediatra (recorrente, lado da oferta)
- **Free**: comissão padrão.
- **Pro** (ex.: 19–49 €/mês): comissão reduzida, ferramentas premium (resumos AI, estatísticas, destaque incluído).

### 6. Destaque pago no marketplace
- Posicionamento/realce no diretório (CPC/CPM ou flat mensal).

### 7. Planos para clínicas (B2B2C, Fase 3)
- Onboarding de equipas, faturação centralizada, fee por seat ou revenue share.

### 8. Parcerias com seguradoras (Fase 3+)
- Telepediatria como benefício; modelo per-member-per-month ou fee por consulta.

## Matriz de pricing por tipo de consulta (ilustrativa — preço definido pelo pediatra)

| Tipo | Faixa típica (€) | Comissão sugerida | Notas |
|---|---|---|---|
| Mensagem (single) | 10–25 | 20% | SLA ex.: 2–12h úteis |
| Pacote de mensagens | 30–60 | 20% | N mensagens / janela de dias |
| Assíncrona estruturada | 15–30 | 20% | Questão + anexos + resposta |
| Follow-up 24/48/72h | 5–15 | 15–20% | Após consulta inicial |
| Videochamada | 30–60 | 15–20% | Ticket mais alto |
| Segunda opinião | 40–90 | 15–20% | Revisão de exames/relatórios |
| Renovação de receita | 10–20 | 20% | Sujeito a regras clínicas/legais |
| Subscrição familiar | 7,99–14,99/mês | n/a (plataforma) | Receita direta da plataforma |

> Comissões podem ser **escalonadas** (ex.: menor acima de X €/mês de faturação do pediatra) para premiar volume e retenção.

## Unit economics (modelo ilustrativo)

**Por consulta de mensagem a 18 €, comissão 20%, híbrido +0,30 €:**
- GMV: 18,00 €
- Comissão plataforma: 3,60 € + 0,30 € = **3,90 €**
- Custo de pagamento (~1,5–2,9% + taxa): ≈ 0,40–0,70 €
- Custo de faturação (parceiro certificado, por doc): ≈ 0,05–0,15 €
- Custo de infra/vídeo (mensagem ≈ 0): baixo
- **Margem de contribuição por transação: ≈ 2,8–3,3 €**

**LTV ilustrativo (família):** 6 consultas/ano × 3 € margem × 2,5 anos ≈ **45 €** + subscrição (se aderir: 12 €/mês × 70% margem × 18 meses ≈ 150 €). **CAC alvo** < 1/3 do LTV.

## Benchmark de comissões (referência de marketplaces de saúde/serviços)
- Marketplaces de serviços profissionais: 10–30%.
- Telemedicina B2C: frequentemente modelos de subscrição + fee.
- **Recomendação Pédia**: começar em **20%** (transparente para o pediatra), com plano Pro que reduz para ~12–15%, para incentivar adesão e exclusividade prática.

## Estratégia de preços e elasticidade
- **Pré-pagamento/autorização** obrigatório (reduz no-shows e incobráveis).
- **Transparência total** antes de pagar (preço, âmbito, SLA).
- **Reembolso garantido** se o pediatra não responder dentro do SLA (confiança do lado da procura).
- Testar **pacotes** e **subscrição** cedo para aumentar frequência.

## Go-to-market (resumo; detalhe no doc 20)
1. **Lado da oferta primeiro**: recrutar 30–80 pediatras de referência em Lisboa/Porto (eles trazem os pais — *supply-led*).
2. Cada pediatra convida a sua base de famílias (canal de aquisição barato e de alta confiança).
3. Conteúdos + parcerias com clínicas/farmácias/marcas infantis.
4. Avaliações verificadas e marca de confiança.

## Riscos do modelo de negócio
- **Desintermediação** (pais e médicos saem para o WhatsApp): mitigar com valor real — faturação, registo, pagamento garantido, conveniência, e não bloqueando relação mas tornando-a melhor dentro da plataforma.
- **Sensibilidade à comissão dos pediatras**: mitigar com plano Pro e transparência.
- **Sazonalidade/frequência baixa**: mitigar com subscrição e múltiplos tipos de consulta.
- **Regulação fiscal** que altere quem fatura/IVA: ver docs 12 e 13.
