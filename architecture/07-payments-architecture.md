# 07 · Payments Architecture

*(CTO + Principal Solution Architect + Compliance Officer)*

Pagamentos com **pré-pagamento/escrow → split no fecho → payout**, abstraídos por uma **port `PaymentProvider`** (Stripe Connect primário, SIBS adicionável). Faturação certificada AT acoplada por evento. Ver [fluxos do blueprint](../docs/11-fluxos-pagamento.md) e [faturação](../docs/12-faturacao-portugal.md).

## Componentes

```mermaid
flowchart TB
    subgraph PAYDOM["Payments Domain (Hexagonal)"]
        PSVC["Payment Service\n(intents, hold, capture, refund)"]
        SPLIT["Split Engine\n(CommissionRule: %/fixo/híbrido/plano)"]
        PAYOUT["Payout Scheduler"]
        LEDGER["Ledger (double-entry)\nsaldos, clawbacks"]
        PORT["Port: PaymentProvider"]
    end
    PORT --> STRIPE["Adapter Stripe Connect\n(MB WAY, cartão, Apple/Google Pay, Multibanco)"]
    PORT --> SIBS["Adapter SIBS (futuro)"]
    PSVC --> SPLIT --> LEDGER
    PSVC --> PORT
    PAYOUT --> PORT
    PSVC --> BUS[("Event Bus")]
    BUS --> INV["Invoicing worker"]
    INV --> BILL["Parceiro Faturação AT\n(ATCUD/QR/SAF-T)"]
```

## Data Flow Diagram — Consulta paga (pré-pago → captura → split → fatura)

```mermaid
sequenceDiagram
    autonumber
    participant Pai
    participant App
    participant Core as Payments
    participant PSP as Stripe Connect
    participant Bus as Event Bus
    participant Inv as Invoicing
    participant Bill as Faturação AT
    Pai->>App: confirma consulta (preço/SLA/âmbito)
    App->>Core: criar PaymentIntent (idempotency-key)
    Core->>PSP: criar intent (MB WAY/cartão) — hold/escrow
    PSP-->>Pai: confirma (push MB WAY / 3DS)
    PSP-->>Core: webhook assinado: authorized/charged
    Core-->>App: consulta = aberta (SLA timer)
    Note over Core,PSP: fundos retidos (escrow) na plataforma
    App->>Core: pediatra respondeu → fechar consulta
    Core->>PSP: capture + transfer (valor pediatra) reter application_fee (comissão)
    Core->>Core: Split + Ledger (comissão vs pediatra)
    Core->>Bus: payment.captured
    Bus->>Inv: invoice.requested
    Inv->>Bill: emitir fatura ato médico (em nome/conta do pediatra) + fatura comissão
    Bill-->>Inv: docs (ATCUD/QR) + SAF-T
    Inv->>Bus: invoice.issued → notifica pai/pediatra
```

## Data Flow Diagram — Reembolso / SLA falhado / disputa

```mermaid
sequenceDiagram
    autonumber
    participant Sys as Sistema/Admin
    participant Core as Payments
    participant PSP
    participant Bill as Faturação AT
    alt SLA falhado
        Sys->>Core: reembolso automático (total)
    else Disputa/chargeback
        Sys->>Core: arbitragem → total/parcial
    end
    Core->>PSP: refund (+ clawback do transfer/fee)
    Core->>Core: Ledger ajusta saldo pediatra (saldo negativo se já pago)
    Core->>Bill: nota de crédito
    Core->>PSP: (chargeback) submeter evidências (registo, consentimentos, SLA)
```

## Modelo de fundos (escrow-like)
- **Cartão**: auth hold → capture no fecho.
- **MB WAY/Multibanco**: cobrança imediata → **retenção na conta da plataforma (escrow)** → libertação/transfer no fecho; **reembolso** se SLA falhar.
- **Separate charges & transfers** (Stripe): plataforma recebe, depois transfere ao pediatra retendo `application_fee` (comissão).
- ⚠️ Enquadramento de **escrow/serviços de pagamento** a validar (PSP como agente regulado; plataforma não presta serviços de pagamento por si) — ver [doc 18](../docs/18-perguntas-criticas.md).

## Split & comissões (configurável)
- `CommissionRule` por **pediatra / país / tipo de consulta / plano** → **%, fee fixo, híbrido, plano mensal, destaque**.
- **Ledger double-entry** garante rastreabilidade (GMV, comissão, líquido do pediatra, reembolsos, clawbacks) — fonte para dashboard financeiro e reconciliação.

## Faturação compliant (separação clara)
- **Doc 1**: ato médico → paciente (emitido **em nome e por conta do pediatra**; provável **isenção de IVA** — a validar).
- **Doc 2**: comissão → pediatra (IVA 23% — a validar).
- **Multi-emitente** (cada pediatra é emitente fiscal); ATCUD/QR/SAF-T/e-Fatura via parceiro certificado.
- Camada `TaxRule`/`Country` **plugável por país** para expansão.

## Segurança de pagamentos
- **PCI-DSS SAQ A** (tokenização do PSP; nunca tocar PAN).
- **SCA/3-D Secure** (PSD2); **webhooks assinados e verificados**; **idempotência**; **reconciliação diária**; **rolling reserve** para chargebacks (a negociar com PSP).

## Justificação (resumo — detalhe no [doc 13](13-technology-stack.md))
- **Stripe Connect primeiro**: split + KYC de pediatras + cobertura de métodos + DX → velocidade de MVP.
- **Abstração `PaymentProvider`**: adicionar **SIBS** para MB WAY a custo otimizado quando o volume justificar, sem reescrever o domínio.
- **Ledger próprio**: nunca depender só do PSP para a verdade financeira (auditoria, multi-PSP, multi-país).
