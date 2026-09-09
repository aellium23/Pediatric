# 08 · Wireframes & Screens — PEDIATRA (Pediatrician)

App mobile + portal web (master-detail em ecrãs grandes — [doc 06](06-responsive-behavior.md)). Foco: eficiência clínica, controlo de SLA, confiança e finanças.

---

## D-01 · Registo profissional
```
┌─────────────────────────────┐
│ ‹  Sou pediatra             │
│ Junta-te à Pédia            │
│                             │
│ [ Continuar com Apple  ]    │
│ [ Continuar com Google ]    │
│ [ Email profissional   ]    │
│                             │
│ Vais precisar de:           │
│  • Cédula da Ordem 🪪        │
│  • Documento de identidade  │
│  • IBAN + dados fiscais     │
│                             │
│  [  Começar registo  ]      │
└─────────────────────────────┘
```
**Description** · Define expectativas de verificação à partida. *A11y*: lista de requisitos como checklist. *Ação*: **Começar registo**.

## D-02 · Verificação / KYC (multi-passo)
```
┌─────────────────────────────┐
│ ‹  Verificação    ●●○○       │
│ 1 Identidade  ✓             │
│ 2 Cédula profissional ▸     │
│   Nº cédula [__________]    │
│   [ 📷 carregar comprovativo]│
│ 3 IBAN + fiscal             │
│ 4 MFA (obrigatório)         │
│ ───────────────────────────│
│ 🔒 Validado pela equipa em  │
│ até 48h.                    │
│  [  Submeter passo  ]       │
└─────────────────────────────┘
```
**Description** · Stepper com progresso; upload de cédula/ID (com scan); **MFA obrigatório**. *Estados*: por validar/validado/rejeitado-com-motivo. *A11y*: progresso anunciado; uploads rotulados. *Ação*: **Submeter**.

## D-03 · Estado: Em validação
```
┌─────────────────────────────┐
│        ⏳ Em validação       │
│ A tua conta está a ser       │
│ revista pela equipa Pédia.  │
│ Recebes notificação em ~48h.│
│                             │
│ Entretanto:                 │
│  [ Definir serviços ]       │
│  [ Completar perfil ]       │
└─────────────────────────────┘
```
**Description** · Estado não-bloqueante; permite preparar perfil/serviços. *A11y*: estado claro. *Ação*: preparar perfil.

## D-04 · Inbox de consultas (Tab Consultas)
```
┌─────────────────────────────┐
│ Consultas            ⚙       │
│ [ A responder | Encerradas ]│
│ Ordenar: SLA ▾              │
│ ───────────────────────────│
│ 🔴 Tosse — Ana (4a)         │
│    expira em 0:48 ⚠️         │
│ 🟠 Febre — Leo (8m)         │
│    SLA 3h12 · Marta         │
│ 🟢 Otite — Pedro            │
│    respondida · aguarda fecho│
│ ───────────────────────────│
│ ●2 a responder  ●1 urgente  │
├─────────────────────────────┤
│ 📥   📅   €   ⊙             │
└─────────────────────────────┘
```
**Description** · Fila priorizada por **SLA a expirar**. *Elementos*: segmented (a responder/encerradas), ordenação, cards com estado/contagem. *Estados*: empty ("tudo em dia 🎉"), badge de urgência. *A11y*: urgência por cor+ícone+texto; cards tocáveis. *Ação*: abrir consulta.

## D-05 · Detalhe da consulta (vista clínica)
```
┌─────────────────────────────┐
│ ‹ Febre — Leo, 8m   [estado▾]│
│ [ Histórico | Conversa ]    │
│ ───────────────────────────│
│ Triagem                     │
│  Febre 38.5 · 2 dias        │
│  Sem sinais de alarme       │
│  🖼 erupcao.jpg             │
│ ───────────────────────────│
│ 🧠 Rascunho IA (rever) ⓘ    │
│  "Lactente 8m, febre 2d…"   │
│  [ editar ] [ usar ]        │
│ ───────────────────────────│
│ [ escrever resposta…   ] 📎 │
│  [ Encerrar com resumo ]    │
└─────────────────────────────┘
```
**Description** · Tudo para decidir: triagem, histórico da criança (aba), anexos, **rascunho IA marcado** ("rever e validar"). Web: master-detail (histórico à esquerda, conversa à direita). *Estados*: a responder/respondida; reembolsar (overflow). *A11y*: rascunho IA claramente identificado; abas acessíveis. *Ação*: responder / **Encerrar com resumo**.

## D-06 · Histórico da criança (aba/painel)
```
┌─────────────────────────────┐
│ Leo · 8 meses               │
│ Alergias: — · Medic.: —     │
│ Episódios: Bronquiolite Mar │
│ Vacinas: PNV em dia ✓       │
│ Crescimento: P55/P60        │
│ Ficheiros: 3 [ver]          │
│ 🔒 Acesso registado (audit) │
└─────────────────────────────┘
```
**Description** · Contexto clínico read-only no âmbito da consulta. *A11y*: dados estruturados; nota de auditoria visível. *Ação*: abrir ficheiro.

## D-07 · Encerrar com resumo
```
┌─────────────────────────────┐
│ ‹ Encerrar — Leo            │
│ Resumo (rascunho IA editável)│
│ [ texto…                   ]│
│ Recomendações               │
│ [ • …                      ]│
│ Quando procurar urgência    │
│ [ • …                      ]│
│ Receita  [ + emitir/ anexar]│
│ Reabertura: 48h sem custo   │
│  [  Encerrar e enviar  ]    │
└─────────────────────────────┘
```
**Description** · Resumo **validado pelo médico** (parte do registo clínico). Dispara captura+split+fatura. *A11y*: campos rotulados; receita opcional. *Ação*: **Encerrar e enviar**.

## D-08 · Serviços & Preços
```
┌─────────────────────────────┐
│ ‹ Serviços & Preços    +    │
│ 💬 Mensagem  18€  SLA 4h  ✓ │
│ 🔁 Follow-up 10€  48h     ✓ │
│ 🎥 Vídeo 20m 45€          ✓ │
│ 🧠 2ª opinião 70€         ✓ │
│ 🔁 Renovar receita 15€    ☐ │
│ ───────────────────────────│
│ Âmbito (texto público)      │
│ [__________________________]│
│  [  Guardar  ]              │
└─────────────────────────────┘
```
**Description** · Controlo total de oferta (ativar/desativar, preço, SLA, âmbito). *A11y*: cada serviço com toggle/edição. *Ação*: **Guardar**.

## D-09 · Agenda & Disponibilidade (Tab Agenda)
```
┌─────────────────────────────┐
│ Agenda               +      │
│ [ Disponibilidade | Próximas]│
│ Seg  09:00–13:00      ✎     │
│ Ter  14:00–18:00      ✎     │
│ Slot 20m · Buffer 10m       │
│ Indisponível: 24 Jun (folga)│
│ ───────────────────────────│
│ Próxima: Hoje 15:00 — Ana   │
│  [ Entrar na chamada ]      │
└─────────────────────────────┘
```
**Description** · Define horários/buffers/indisponibilidades; lista de próximas videochamadas. *Estados*: conflito (aviso). *A11y*: blocos com hora/edição; CTA de entrar. *Ação*: adicionar disponibilidade / entrar.

## D-10 · Videochamada (lado pediatra)
```
┌─────────────────────────────┐
│  [ vídeo paciente ]         │
│                ⊙ self        │
│ Notas clínicas (lado)       │
│ [ escrever… ]               │
│ 🎤 📷 ⤢ 📎 ☎ (terminar)     │
│ ● Sem gravação              │
└─────────────────────────────┘
```
**Description** · Chamada + **notas clínicas** em simultâneo (web: painel lateral). Sem gravação por defeito (indicador). *A11y*: controlos grandes rotulados. *Ação*: terminar → resumo pós-consulta.

## D-11 · Finanças (Tab €)
```
┌─────────────────────────────┐
│ Finanças — Junho            │
│ Receita bruta ...... 1.240€ │
│ Comissão Pédia (20%) -248€  │
│ Líquido ............... 992€│
│ Pendente payout ...... 310€ │
│ Próximo payout: 21 Jun      │
│ ───────────────────────────│
│ [ Faturas ] [ Exportar SAF ]│
│ Transações                  │
│  #2026/118 Mensagem  +14,4€ │
│  #2026/117 Vídeo     +36€   │
├─────────────────────────────┤
│ 📥  📅  €  ⊙                │
└─────────────────────────────┘
```
**Description** · Transparência financeira: bruto, comissão, líquido, pendente, payouts, faturas, transações. *A11y*: valores tabulares; export. *Ação*: ver faturas / exportar.

## D-12 · Perfil público (edição) · D-13 · Avaliações
```
PERFIL PÚBLICO            AVALIAÇÕES
┌───────────────┐         ┌───────────────┐
│ ‹ Perfil   👁 │         │ ‹ Avaliações  │
│ ⊙ foto [✎]    │         │ ⭐ 4.9 (132)  │
│ Bio [______]  │         │ ⭐⭐⭐⭐⭐       │
│ Idiomas PT EN │         │ "Atenciosa…"  │
│ Especialidades│         │ — Marta ✓     │
│ Cédula ✅      │         │ (verificada)  │
│ 👁 Pré-visual.│         │ Responder ↩   │
│ [ Guardar ]   │         └───────────────┘
└───────────────┘
```
**Description** · *Perfil*: bio, idiomas, especialidades, foto, badge de cédula, pré-visualização pública. *Avaliações*: verificadas (pós-consulta), com resposta do médico. *A11y*: pré-visualização anunciada; estrelas com valor textual.

## D-14 · Conta & Segurança
```
┌─────────────────────────────┐
│ ‹ Conta & Segurança         │
│ 🔐 MFA  ✓ (obrigatório)     │
│ 🔑 Passkeys [gerir]         │
│ 📱 Dispositivos [gerir]     │
│ 🔔 Notificações             │
│ 🪪 Verificação ✅            │
│ 📄 Termos profissionais     │
│ ❓ Ajuda                    │
│ [ Terminar sessão ]         │
└─────────────────────────────┘
```
**Description** · MFA obrigatório (não desativável), passkeys, dispositivos, estado de verificação. *A11y*: estados de segurança claros. *Ação*: gerir segurança.

---

### Mapa de cobertura (Pediatra)
Onboarding/KYC (D01–03) · Trabalho clínico (D04–07) · Oferta/Agenda (D08–10) · Finanças (D11) · Perfil/Avaliações/Conta (D12–14). Master-detail em web/tablet para D04↔D05.
