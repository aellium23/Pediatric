# 17 · KPIs

## Métrica Norte (North Star)
**Consultas pagas concluídas com sucesso por mês** (resposta dentro do SLA + sem reembolso por falha) — captura valor para pais, pediatras e plataforma simultaneamente.

## Aquisição & Marketplace (liquidez)
- **Pediatras verificados ativos** (responderam ≥1 consulta nos últimos 30 dias).
- **Famílias registadas** e **famílias ativas** (≥1 consulta em 90 dias).
- **Rácio de liquidez**: % de consultas iniciadas que encontram pediatra disponível.
- **Cobertura**: pediatras por especialidade/idioma/cidade.
- **CAC** (por canal; em especial via convite de pediatras).
- **Taxa de conversão**: visita → registo → 1ª consulta paga.

## Engagement & Retenção
- **Frequência**: consultas por família ativa / mês.
- **Retenção** (coortes): D30/D90/M6 de famílias e pediatras.
- **Reabertura/continuidade** com o mesmo pediatra (pediatra favorito).
- **Adoção de subscrição** (Fase 3) e **churn** de subscrição.

## Qualidade clínica & serviço
- **Tempo médio de primeira resposta** (e % dentro do SLA).
- **Taxa de cumprimento de SLA**.
- **CSAT / NPS** (pais e pediatras).
- **Avaliação média** dos pediatras (verificadas).
- **Taxa de encaminhamento para urgência/SNS 24** (segurança — monitorizar, não otimizar para baixar artificialmente).
- **Taxa de reabertura/insatisfação**.

## Financeiras
- **GMV** (volume bruto transacionado).
- **Receita líquida da plataforma** (take rate efetivo).
- **Take rate** médio (comissão / GMV).
- **Ticket médio** por tipo de consulta.
- **Margem de contribuição** por transação.
- **MRR/ARR** (subscrições familiares + planos de pediatra).
- **LTV / CAC** (alvo LTV:CAC ≥ 3).
- **Payback de CAC** (meses).
- **Receita por pediatra ativo** (saúde da oferta).

## Operações & Risco
- **Taxa de reembolsos** (e por motivo: SLA, insatisfação).
- **Taxa de chargebacks/disputas**.
- **No-show rate** (vídeo).
- **Tempo de validação de pediatra** (onboarding da oferta).
- **Tempo de resolução de tickets de suporte**.
- **Incidentes de segurança** / tempo de deteção e resposta.
- **Pedidos RGPD** e tempo de resposta.

## Painel por fase
| Fase | KPIs prioritários |
|---|---|
| MVP | Pediatras ativos, 1ª consulta paga, % SLA, GMV, taxa de reembolso, fatura emitida com sucesso |
| Vídeo+Agenda | No-show, conversão vídeo, ticket médio, CSAT pós-consulta |
| Escala | MRR/subscrições, churn, LTV:CAC, receita/pediatra, cobertura por cidade, prontidão ES |

## Princípios de medição
- **Não otimizar segurança clínica** (ex.: forçar respostas rápidas que comprometam qualidade ou desincentivem encaminhar para urgência).
- Coortes desde o dia 1; eventos analíticos **anonimizados/pseudonimizados** (nunca dados clínicos para analytics sem base legal).
- Dashboards separados: **Crescimento**, **Financeiro**, **Qualidade/Clínico**, **Risco/Compliance**.
