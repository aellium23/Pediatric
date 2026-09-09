# 09 · Wireframes & Screens — CLÍNICA (Clinic)

Portal **web** (responsivo; também acessível em tablet). Sidebar + topbar ([doc 02](02-navigation.md)). Foco: gestão de equipa, operação agregada e faturação centralizada. Multi-tenant (cada clínica é um tenant isolado).

---

## C-01 · Onboarding da clínica
```
┌────────────────────────────────────────────┐
│ Criar clínica na Pédia                      │
│ 1 Dados ▸ 2 Verificação ▸ 3 Equipa ▸ 4 Fatur.│
│ ──────────────────────────────────────────  │
│ Nome da clínica [________________]          │
│ NIF [_________]  ERS/registo [________]     │
│ Morada [__________________________]         │
│ Logótipo [ carregar ]  (white-label)        │
│ Admin responsável [email]                   │
│                              [ Continuar ]  │
└────────────────────────────────────────────┘
```
**Description** · Cria o tenant; recolhe dados fiscais/regulatórios e marca (white-label opcional). *Estados*: validação de NIF; verificação pendente. *A11y*: stepper; campos rotulados. *Ação*: **Continuar**.

## C-02 · Dashboard da clínica
```
┌────────────┬───────────────────────────────┐
│ ▸ Dashboard│ Visão geral — Junho           │
│ ▸ Equipa   │ ┌────────┐┌────────┐┌────────┐ │
│ ▸ Operação │ │Consultas││Receita ││ SLA    │ │
│ ▸ Finanças │ │  428   ││ 6.120€ ││ 96%    │ │
│ ▸ Relatór. │ └────────┘└────────┘└────────┘ │
│ ▸ Definiç. │ Pediatras ativos: 8/10        │
│            │ A responder agora: 5          │
│            │ ⚠️ 1 consulta a expirar       │
│            │ [ Ver operação ]              │
└────────────┴───────────────────────────────┘
```
**Description** · KPIs do tenant (consultas, receita, SLA, equipa ativa), alertas operacionais. *A11y*: cards de métrica com label+valor; alerta com texto. *Ação*: drill-down para operação.

## C-03 · Equipa — Pediatras
```
┌────────────┬───────────────────────────────┐
│ Equipa     │ Pediatras        [ + Convidar ]│
│            │ Nome        Estado   Consultas │
│            │ Dra. Inês   ✅ ativo   132      │
│            │ Dr. Tiago   ✅ ativo    47      │
│            │ Dra. Rita   ⏳ convite pendente │
│            │ [gerir] [permissões] [remover] │
└────────────┴───────────────────────────────┘
```
**Description** · Convidar/gerir pediatras do tenant; estado (ativo/pendente/suspenso); ações. *Estados*: convite pendente/expirado. *A11y*: tabela com cabeçalhos; ações rotuladas. *Ação*: **Convidar**.

## C-04 · Equipa — Staff & Papéis
```
┌────────────┬───────────────────────────────┐
│ Staff      │ Membros          [ + Adicionar]│
│            │ Ana (Receção)  Papel: Staff    │
│            │ João (Gestor)  Papel: Clinic Adm│
│            │ ─────────────────────────────  │
│            │ Papéis & permissões            │
│            │  Clinic Admin: gerir tudo      │
│            │  Clinic Staff: agendar, triagem│
│            │  (sem acesso clínico amplo)    │
└────────────┴───────────────────────────────┘
```
**Description** · Gestão de staff e **RBAC** do tenant (Clinic Admin vs Staff). Least privilege; staff **não** acede a conteúdo clínico amplo. *A11y*: matriz de permissões legível. *Ação*: adicionar/editar papel.

## C-05 · Operação — Consultas & Agenda agregada
```
┌────────────┬───────────────────────────────┐
│ Operação   │ [ Consultas | Agenda ]        │
│            │ Filtro: pediatra ▾ estado ▾   │
│            │ 🔴 Tosse—Ana   Dr.Tiago 0:48  │
│            │ 🟠 Febre—Leo   Dra.Inês 3h12  │
│            │ ── Agenda (semana) ──         │
│            │ Seg Ter Qua Qui Sex           │
│            │  ▣   ▣   ▢   ▣   ▣  (slots)   │
└────────────┴───────────────────────────────┘
```
**Description** · Visão agregada de consultas e agenda de toda a equipa; filtros. *A11y*: filtros e grelha acessíveis; estados por cor+ícone+texto. *Ação*: reatribuir/abrir consulta.

## C-06 · Finanças — Faturação centralizada
```
┌────────────┬───────────────────────────────┐
│ Finanças   │ Junho                          │
│            │ GMV clínica ........ 30.600€   │
│            │ Comissão Pédia ..... -5.508€   │
│            │ Líquido clínica .... 25.092€   │
│            │ Por pediatra [ver detalhe]     │
│            │ Faturas [ exportar SAF-T ]     │
│            │ Payouts: 21 Jun                │
└────────────┴───────────────────────────────┘
```
**Description** · Faturação e comissões agregadas do tenant + repartição por pediatra; export SAF-T. *A11y*: valores tabulares; export rotulado. *Ação*: ver detalhe / exportar.

## C-07 · Relatórios
```
┌────────────┬───────────────────────────────┐
│ Relatórios │ Período [ Junho ▾ ]  [export] │
│            │ Consultas/dia  ▁▂▃▅▇▅▃         │
│            │ SLA cumprido ....... 96%       │
│            │ CSAT ............... 4.7/5     │
│            │ Tempo médio resp. .. 2h10      │
│            │ Por pediatra [tabela]          │
└────────────┴───────────────────────────────┘
```
**Description** · Desempenho operacional/clínico do tenant. *A11y*: gráficos com tabela alternativa. *Ação*: exportar.

## C-08 · Definições
```
┌────────────┬───────────────────────────────┐
│ Definições │ Dados da clínica [editar]      │
│            │ Marca/white-label (cor, logo)  │
│            │ Papéis & permissões            │
│            │ Integrações (calendário)       │
│            │ 🔒 Privacidade & DPA           │
│            │ Faturação (parceiro AT)        │
└────────────┴───────────────────────────────┘
```
**Description** · Configuração do tenant: dados, marca (theming via tokens — [doc 04](04-design-system-foundations.md)), papéis, integrações, privacidade/DPA. *A11y*: secções com headings. *Ação*: editar.

---

### Mapa de cobertura (Clínica)
Onboarding (C01) · Dashboard (C02) · Equipa/Papéis (C03–04) · Operação (C05) · Finanças/Relatórios (C06–07) · Definições (C08). Tudo isolado por **tenant** (multi-tenant) com RBAC próprio.
