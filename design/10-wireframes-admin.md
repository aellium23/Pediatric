# 10 · Wireframes & Screens — ADMINISTRADOR (Backoffice)

Backoffice **web** atrás de SSO + MFA + rede restrita. Sidebar + topbar. Perfis internos: Platform Admin, Support, Finance, Compliance (RBAC fino — [doc 03 IAM](../enterprise/03-iam-authentication.md)). Densidade compacta para produtividade.

---

## A-01 · Visão geral (KPIs)
```
┌────────────┬───────────────────────────────┐
│ ▸ Visão    │ Plataforma — Junho            │
│ ▸ Utilizad.│ ┌──────┐┌──────┐┌──────┐┌─────┐│
│ ▸ Validação│ │ GMV  ││Rec.líq││Conv. ││CSAT ││
│ ▸ Pagamentos│ │284k€ ││ 56,8k││ 24%  ││4.7  ││
│ ▸ Config.  │ └──────┘└──────┘└──────┘└─────┘│
│ ▸ Relatór. │ Famílias 12.4k · Pediatras 312│
│ ▸ Moderação│ ⚠️ 4 validações · 2 disputas  │
│ ▸ Complianc│ Tempo médio resp. 2h10        │
│ ▸ Suporte  │ [ Fila de validação ]         │
└────────────┴───────────────────────────────┘
```
**Description** · Cockpit: GMV, receita líquida, conversão, CSAT, contagens, alertas de ação (validações/disputas). *A11y*: cards métrica label+valor; alertas com texto. *Ação*: ir para fila prioritária.

## A-02 · Utilizadores
```
┌────────────┬───────────────────────────────┐
│ Utilizadores│ 🔎 procurar  [pais|pediatras|│
│            │               clínicas|staff] │
│            │ Nome      Tipo    Estado  Ação│
│            │ Marta S.  Pai     ativo  [ver]│
│            │ Dra.Inês  Pediatra ✅    [ver]│
│            │ Clínica X Tenant  ativo  [ver]│
│            │ (suspender / impersonar*)     │
│            │ *acesso clínico mascarado+audit│
└────────────┴───────────────────────────────┘
```
**Description** · Gestão de utilizadores com pesquisa/filtragem. *Privacidade*: Support **não** vê conteúdo clínico (mascarado); impersonação só com **break-glass auditado**. *A11y*: tabela acessível. *Ação*: ver/gerir.

## A-03 · Validação de pediatras (fila KYC/cédula)
```
┌────────────┬───────────────────────────────┐
│ Validação  │ Pendentes (4)                  │
│            │ ┌───────────────────────────┐  │
│            │ │ Dra. Rita Lopes           │  │
│            │ │ Cédula 12345 [ver doc] 🔍 │  │
│            │ │ Identidade   [ver doc] 🔍 │  │
│            │ │ IBAN/fiscal  [ver]        │  │
│            │ │ [Aprovar][Pedir correção] │  │
│            │ │ [Rejeitar]  Notas […]     │  │
│            │ └───────────────────────────┘  │
└────────────┴───────────────────────────────┘
```
**Description** · Revisão de credenciais (cédula/identidade/IBAN); decisão com motivo; tudo auditado. *Estados*: aprovado/correção/rejeitado. *A11y*: visualizador de docs acessível; decisões rotuladas. *Ação*: **Aprovar**.

## A-04 · Pagamentos — Transações
```
┌────────────┬───────────────────────────────┐
│ Pagamentos │ [Transações|Reembolsos|Disputas│
│            │  |Payouts]                     │
│            │ Filtro: estado·método·período  │
│            │ ID    Pai   Pediatra Val Estado│
│            │ #4521 Marta Inês  18€ capturado│
│            │ #4522 Rui   Tiago 45€ disputa ⚖│
│            │ [ver] [reembolsar] [exportar]  │
└────────────┴───────────────────────────────┘
```
**Description** · Gestão financeira: transações, reembolsos, disputas, payouts. *Permissão*: perfil **Finance**. *A11y*: tabela densa acessível; ações rotuladas. *Ação*: reembolsar/exportar.

## A-05 · Disputa (detalhe + arbitragem)
```
┌────────────────────────────────────────────┐
│ ‹ Disputa #4522 — Vídeo, Rui vs Dr. Tiago   │
│ Motivo: "não compareceu"                    │
│ Evidência (registo): chamada 0min · no-show?│
│ Consentimentos ✓ · SLA ✓ · logs [ver]       │
│ Decisão: ( ) Reembolso total                │
│          ( ) Parcial __%                     │
│          ( ) Negar                           │
│ Nota ao cliente [______]                     │
│              [ Decidir e notificar ]         │
└────────────────────────────────────────────┘
```
**Description** · Arbitragem com evidência do registo (sem expor clínico desnecessário). Gera nota de crédito/estorno. *A11y*: opções de decisão como radio; evidência rotulada. *Ação*: **Decidir e notificar**.

## A-06 · Configuração — Comissões & Planos
```
┌────────────┬───────────────────────────────┐
│ Config.    │ [Comissões|Planos|Subscrições| │
│            │  Destaque]                     │
│            │ Regra   Âmbito       Modelo    │
│            │ Padrão  Global       20%       │
│            │ Pro     Plano Pro    14%       │
│            │ PT-vídeo País:PT/vídeo 17%     │
│            │ Dr.X    Pediatra     18%+0,30€ │
│            │ [ + Nova regra ]               │
└────────────┴───────────────────────────────┘
```
**Description** · Motor de **comissões configuráveis** por global/país/pediatra/tipo/plano; planos, subscrições, destaque marketplace. *A11y*: tabela de regras; formulário de regra acessível. *Ação*: **Nova regra**.

## A-07 · Relatórios
```
┌────────────┬───────────────────────────────┐
│ Relatórios │ Período [ Junho ▾ ] [exportar]│
│            │ GMV ▁▂▃▅▇  284k€              │
│            │ Conversão funil:              │
│            │  Visita→Registo→1ª consulta   │
│            │  100% → 38% → 24%             │
│            │ Retenção (coortes) [tabela]   │
│            │ SLA 95% · Tempo resp. 2h10    │
│            │ Receita por pediatra [top]    │
└────────────┴───────────────────────────────┘
```
**Description** · GMV, conversão, retenção, SLA, tempo de resposta, satisfação, receita por pediatra. *A11y*: gráficos com tabela alternativa; export CSV. *Ação*: exportar.

## A-08 · Moderação & Auditoria
```
┌────────────┬───────────────────────────────┐
│ Moderação  │ [Avaliações|Conteúdos|Audit]  │
│            │ Avaliação reportada:          │
│            │  "..." [aprovar][remover]     │
│            │ ── Audit log ──               │
│            │ 14:02 Support viu #4521 (mask)│
│            │ 14:05 Admin aprovou Dra.Rita  │
│            │ 🔒 append-only · imutável     │
└────────────┴───────────────────────────────┘
```
**Description** · Moderar avaliações/conteúdos; **audit log imutável** (quem/quando/o quê). *A11y*: registo cronológico legível. *Ação*: moderar / inspecionar.

## A-09 · Compliance (RGPD)
```
┌────────────┬───────────────────────────────┐
│ Compliance │ Pedidos RGPD (3)              │
│            │ • Acesso — Marta S. [tratar]  │
│            │ • Eliminação — João P.[tratar]│
│            │ • Portabilidade — … [tratar]  │
│            │ Consentimentos [ver registo]  │
│            │ Retenção [políticas]          │
│            │ DPIA / RoPA [documentos]      │
│            │ Violações [reportar CNPD 72h] │
└────────────┴───────────────────────────────┘
```
**Description** · Perfil **Compliance/DPO**: tratar DSR (acesso/eliminação/portabilidade), consentimentos, retenção, DPIA/RoPA, fluxo de violação (CNPD 72h). *A11y*: filas e ações claras. *Ação*: **tratar** pedido.

## A-10 · Suporte (tickets & incidentes)
```
┌────────────┬───────────────────────────────┐
│ Suporte    │ Tickets [abertos|todos]       │
│            │ #882 Pai — pagamento falhou    │
│            │ #881 Pediatra — KYC dúvida     │
│            │ SLA suporte: 1ª resp. 2h       │
│            │ Incidentes (SEV) [ver]         │
└────────────┴───────────────────────────────┘
```
**Description** · Tickets e incidentes; ligação a IR/SecOps para SEV. *A11y*: fila acessível. *Ação*: responder ticket.

---

### Mapa de cobertura (Admin)
Visão (A01) · Utilizadores (A02) · Validação (A03) · Pagamentos/Disputas (A04–05) · Config comissões/planos (A06) · Relatórios (A07) · Moderação/Audit (A08) · Compliance/RGPD (A09) · Suporte (A10).

### Segurança & privacidade do backoffice
- **SSO + MFA obrigatório**, rede restrita, **RBAC fino** por perfil (Admin/Support/Finance/Compliance) com **least privilege** e **segregation of duties** (quem aprova ≠ quem paga).
- Acesso a dados clínicos **mascarado** por defeito; **break-glass auditado** quando necessário.
- Todas as ações em **audit log imutável**.
