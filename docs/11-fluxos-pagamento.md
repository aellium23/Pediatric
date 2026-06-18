# 11 · Fluxos de Pagamento

## Objetivos
- **Pré-pagamento/autorização** para eliminar incobráveis e no-shows.
- **Split automático**: comissão para a plataforma, restante para o pediatra.
- Métodos PT: **MB WAY, cartão, Apple Pay, Google Pay, Multibanco**.
- Tratar **reembolsos, chargebacks, cancelamentos, no-shows, disputas**.

## Decisão estratégica: Stripe Connect vs SIBS

| Critério | **Stripe Connect** | **SIBS (Marketplace/Gateway) + MB WAY** |
|---|---|---|
| Split nativo | ✅ Sólido (transfers, application_fee, escrow via separate charges) | ⚠️ Marketplace/splits existe mas integração mais pesada/comercial |
| MB WAY | ✅ Suportado por Stripe em PT (e via parceiros) | ✅ Nativo (é o dono do MB WAY) |
| Multibanco (referências) | ✅ Suportado | ✅ Nativo |
| Apple/Google Pay, cartão | ✅ Excelente | ✅ |
| Onboarding/KYC de pediatras | ✅ Connect Express trata KYC/AML | ⚠️ Mais manual/comercial |
| Rapidez de integração | ✅ DX excelente | ⚠️ Mais lento |
| Custo | ~1,5% intra-EU cartões + fees | Negociável, potencialmente menor em MB WAY a volume |
| Adoção local (PT) | MB WAY é rei em PT | MB WAY é rei em PT |

**Recomendação:** começar com **Stripe Connect (Express)** para velocidade, split e KYC integrados, **com MB WAY/Multibanco ativos**. Avaliar **SIBS** como **adição** quando o volume de MB WAY justificar negociar custos diretamente, ou se a cobertura/UX de MB WAY via Stripe ficar aquém. Arquitetar a camada de pagamentos com **interface abstrata** (`PaymentProvider`) para trocar/combinar PSPs por método/país.

> ⚠️ Validar cobertura **atual** de MB WAY no Stripe e condições da **SIBS Marketplace/Splits** com ambos os comerciais antes de fechar (doc 18). MB WAY tem particularidades de fluxo (push para a app do utilizador, timeout).

## Modelo de fundos: separate charges & transfers (escrow-like)
1. **Autorização/hold** no pagamento do pai quando inicia a consulta (cartão: auth hold; MB WAY: cobrança imediata → fundos retidos na conta da plataforma).
2. Fundos ficam na **conta da plataforma** até ao **fecho da consulta** (cumprimento do SLA).
3. No fecho: **transfer** do valor do pediatra para a sua conta conectada, **retendo `application_fee`** (comissão).
4. **Payout** do PSP para o IBAN do pediatra conforme calendário.

> Nota: MB WAY/Multibanco normalmente **cobram já** (não há "auth hold" como em cartão). Por isso o modelo é **cobrar + reter na plataforma (escrow) + libertar no fecho**, com **reembolso** se o SLA falhar. Confirmar enquadramento (atuar como escrow pode ter implicações — ver doc 13/18).

## Estados de pagamento
```
created → authorized/charged → (hold/escrow) → captured/settled → split → payout
                    │                              │
                    ├── failed                     ├── refunded (total/parcial)
                    └── expired (MB WAY timeout)   └── charged_back → dispute
```

## Fluxo A — Consulta por mensagem (pré-pago)
1. Pai confirma preço/SLA/âmbito → escolhe método.
2. **MB WAY**: push para a app do banco → confirma → fundos na plataforma (escrow).
   **Cartão/Apple/Google Pay**: cobrança/hold.
3. `Consultation = open`, SLA timer arranca.
4. Pediatra responde no SLA → ao **fechar**, captura + split + payout agendado + **fatura**.
5. **SLA falhado** → reembolso automático (estorno total).

## Fluxo B — Videochamada (Fase 2)
1. Pagamento **na marcação** (escrow).
2. **No-show do pai**: política configurável (ex.: cobra X%, reembolsa resto) — regras + janelas.
   **No-show/cancelamento do pediatra**: reembolso total + eventual penalização.
3. Conclusão → captura + split + fatura + resumo.

## Reembolsos, cancelamentos, no-shows
- **Cancelamento pelo pai** dentro da janela → reembolso total; fora da janela → regra (parcial/taxa).
- **No-show**: regras configuráveis por pediatra/plataforma.
- **Reembolso parcial**: estorna proporcionalmente comissão e valor do pediatra (clawback do `application_fee` e do transfer; se já houve payout, gera **saldo negativo**/dedução futura).
- **Nota de crédito** fiscal emitida a cada reembolso (doc 12).

## Chargebacks & disputas
- Cartão: fluxo de contestação com **evidências** (registo da consulta, consentimentos, resposta dentro do SLA, logs).
- Disputa interna (pai insatisfeito): mediação pelo **Admin**; decisão → reembolso total/parcial/negado.
- Reserva de risco/rolling reserve a considerar com o PSP para cobrir chargebacks.

## Comissões (configuráveis)
- Por **pediatra / país / tipo de consulta / plano**, via `CommissionRule`.
- Modelos: **% , fee fixo, plano mensal (comissão reduzida), híbrido, destaque pago**.
- Cálculo do split no momento do fecho, registado em `Split` (auditável).

## Segurança de pagamentos
- **PCI-DSS**: nunca tocar em PAN — usar elementos/tokenização do PSP (SAQ A).
- **SCA/3-D Secure** (PSD2) para cartões.
- Idempotência em todas as operações de pagamento; reconciliação diária; webhooks assinados e verificados.
