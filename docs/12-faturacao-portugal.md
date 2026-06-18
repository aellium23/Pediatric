# 12 · Modelo de Faturação para Portugal

> ⚠️ **Esta secção é uma proposta de engenharia/produto. As decisões fiscais finais (quem fatura, IVA vs isenção, retenções) TÊM de ser confirmadas por contabilista certificado/fiscalista e, idealmente, com a AT.** Ver [doc 18](18-perguntas-criticas.md).

## O problema central: quem emite a fatura ao paciente?

Há duas naturezas de transação **distintas** que não se devem misturar:

1. **Ato médico** (consulta) — prestado pelo **pediatra** ao **paciente/família**.
2. **Serviço de intermediação/tecnologia** (comissão) — prestado pela **plataforma** ao **pediatra** (e/ou taxa ao utilizador).

### Modelos jurídicos possíveis

| Modelo | Quem fatura o ato médico ao paciente | Comissão | Implicações |
|---|---|---|---|
| **A — Agente/Marketplace (recomendado p/ começar)** | **O pediatra** fatura diretamente o paciente (a plataforma emite **em nome e por conta** do pediatra via software certificado) | Plataforma fatura **comissão ao pediatra** | Mantém o ato médico na esfera do médico (provável **isenção de IVA** do ato médico); plataforma só fatura serviço (com IVA) ao médico |
| **B — Revenda/Plataforma principal** | **A plataforma** fatura o paciente pelo valor total e depois paga o médico | Plataforma retém margem | Pode descaracterizar a isenção do ato médico e sujeitar tudo a IVA; risch fiscal/regulatório maior |
| **C — Híbrido** | Pediatra fatura ato; plataforma fatura **taxa de serviço ao utilizador** separada | Ambos faturam | Mais complexo; clareza para o utilizador |

**Recomendação de partida: Modelo A.** O pediatra é o prestador do ato médico; a plataforma é **intermediário tecnológico** que (a) **emite a fatura do ato médico em nome e por conta do pediatra** através de **software certificado pela AT**, e (b) **fatura a sua comissão ao pediatra**. Isto preserva melhor a eventual **isenção de IVA dos serviços médicos** e o enquadramento como **intermediário** (não prestador de cuidados). **A validar.**

## IVA / Isenção (a confirmar)
- **Serviços médicos** (prestados por profissional habilitado, com finalidade terapêutica/saúde) são, em regra, **isentos de IVA** em Portugal (CIVA, isenção dos serviços médicos). A **isenção depende da natureza do ato** e de o prestador ser profissional de saúde.
- A **comissão da plataforma** é um serviço de **intermediação/tecnologia** → **sujeito a IVA à taxa normal (23%)**.
- ⚠️ **Renovação de receita, segunda opinião, triagem** — confirmar caso a caso se mantêm natureza de ato médico isento.
- ⚠️ Faturação **cross-border** (médico/paciente em países diferentes; expansão) muda as regras de IVA (regras OSS/B2B/B2C) — desenhar desde já a camada `TaxRule` por país.

## Requisitos técnicos de faturação em Portugal
Qualquer documento fiscal emitido tem de cumprir:
- **Software certificado pela AT** (ou integração com parceiro certificado).
- **NIF** do emitente e do adquirente (quando aplicável).
- **ATCUD** (código único de documento) + **QR Code** em todas as faturas.
- **Comunicação SAF-T (PT)** / séries comunicadas à AT; comunicação de faturas (e-Fatura).
- Numeração sequencial por série; integridade e inalterabilidade.

## Arquitetura de faturação proposta

```
Consultation.closed → evento "billing.requested"
        │
        ▼
  Billing Orchestrator (módulo invoicing)
        ├── determina modelo jurídico + país + TaxRule
        ├── calcula: valor ato médico, IVA/isenção, comissão, IVA da comissão
        ▼
  Parceiro de faturação certificado (API): Vendus / InvoiceXpress / Moloni / Cegid / Sage
        ├── Doc 1: Fatura ato médico (emitida em nome/conta do PEDIATRA) → paciente
        │           [NIF, ATCUD, QR, isenção c/ menção legal] → SAF-T/e-Fatura
        └── Doc 2: Fatura comissão (emitida pela PLATAFORMA) → pediatra
                    [NIF, ATCUD, QR, IVA 23%] → SAF-T/e-Fatura
        ▼
  Guarda Invoice/CommissionInvoice (PDF + metadados) · entrega a pai/pediatra
```

### Porque usar parceiro certificado (vs construir)
- Certificação de software de faturação pela AT é **morosa e cara**. **Comprar** (parceiro certificado via API) é o caminho para o MVP e provavelmente para sempre.
- Candidatos com API: **Vendus, InvoiceXpress, Moloni, Cegid Primavera, Sage**. Avaliar: emissão **em nome e por conta de terceiros** (essencial para o Modelo A), multi-emitente (cada pediatra é um emitente), suporte a séries/ATCUD/QR/SAF-T, e custo por documento.

### Multi-emitente (chave para o Modelo A)
Cada pediatra é um **emitente fiscal distinto** (com o seu NIF e regime). O parceiro tem de suportar **emissão por conta de múltiplos emitentes** ou cada pediatra ter a sua conta/série. Confirmar capacidade do parceiro.

## Separação clara no documento e no produto
Em todos os ecrãs e documentos, mostrar separadamente:
- **Valor da consulta médica** (com menção de isenção de IVA, se aplicável, com a referência legal).
- **Comissão/serviço da plataforma** (com IVA, se aplicável).
- Total pago pelo pai.

## Retenções e obrigações do pediatra
- Pediatras podem estar em **regime de isenção de IVA (art.º 53.º)** ou regime normal — afeta a faturação da comissão.
- **Retenção na fonte / IRS**: o médico declara os seus rendimentos; a plataforma deve fornecer **relatórios anuais** de valores pagos. Confirmar obrigações de comunicação da plataforma (ex.: declarações de pagamentos a terceiros).

## Expansão internacional (arquitetura fiscal escalável)
- Camada `TaxRule` + `Country` + estratégia de faturação **plugável por país**.
- Parceiro de faturação por país (ou parceiro multi-país) — o de PT pode não servir ES/FR.
- Regras de IVA intracomunitário, **OSS**, B2B vs B2C, isenções de serviços médicos por jurisdição.
- **Não** assumir que o modelo PT se replica — cada país requer validação fiscal local.

## Checklist de faturação para o MVP
- [ ] Decisão de modelo jurídico (A recomendado) validada por fiscalista.
- [ ] Parceiro certificado escolhido + suporte a emissão por conta de terceiros confirmado.
- [ ] Tratamento de IVA/isenção por tipo de consulta definido.
- [ ] ATCUD/QR/SAF-T/e-Fatura a funcionar em ambiente real.
- [ ] Notas de crédito para reembolsos.
- [ ] Relatórios fiscais para pediatras e para a plataforma.
- [ ] Política de retenção de documentos fiscais (prazo legal).
