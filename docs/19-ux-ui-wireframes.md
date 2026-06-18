# 19 · UX/UI e Wireframes Descritivos

## Princípios de design
- **Mobile-first**, premium, limpo, com muito espaço em branco e hierarquia clara.
- **Reduzir ansiedade**: linguagem tranquilizadora, próximos passos óbvios, nunca alarmista mas sempre segura.
- **Transparência total** antes de pagar: preço, SLA, âmbito e exclusões sempre visíveis.
- **Confiança visível**: badges de verificação, encriptação, avaliações verificadas.
- **Acessibilidade** (WCAG AA): contraste, tamanhos de toque, leitores de ecrã, fontes legíveis.
- **Segurança clínica sempre presente**: acesso rápido a "Isto é uma emergência?" → SNS 24 / 112.

## Tom de comunicação
- **Seguro, humano, clínico, simples e tranquilizador.**
- Exemplos:
  - ✅ "Recebemos a sua questão. A Dra. Inês costuma responder em até 4 horas."
  - ✅ "Se notar [sinais], não espere: ligue SNS 24 (808 24 24 24) ou vá à urgência."
  - ❌ "Chat ao vivo grátis!" (errado — não é o posicionamento)
- Microcopy que valida o sentimento do pai sem dramatizar.

## Sistema visual (sugestão)
- Paleta calma e clínica: azuis/verdes suaves + acento quente humano; branco dominante.
- Tipografia legível e moderna; ícones suaves; ilustrações humanas e inclusivas (famílias diversas).
- Componentes consistentes (design system) partilhados entre app e web.

---

## Wireframes descritivos — App dos Pais

### W1 · Onboarding / Registo
```
┌─────────────────────────────┐
│  [logo Pédia]               │
│                             │
│  O pediatra de confiança,   │
│  à distância de uma         │
│  mensagem.                  │
│                             │
│  [ Continuar com Apple   ]  │
│  [ Continuar com Google  ]  │
│  [ Telefone / Email      ]  │
│                             │
│  Ao continuar aceita os     │
│  Termos e a Privacidade.    │
└─────────────────────────────┘
```
- Após método → OTP → ecrã de consentimentos (Termos, Privacidade) com links legíveis.

### W2 · Home (família)
```
┌─────────────────────────────┐
│ Olá, Marta 👋        [perfil]│
│                             │
│  As suas crianças           │
│  ┌────┐ ┌────┐ ┌───────┐    │
│  │ 👶 │ │ 🧒 │ │  +    │    │
│  │Leo │ │Ana │ │Adicio.│    │
│  └────┘ └────┘ └───────┘    │
│                             │
│  Ação rápida                │
│  [ Nova consulta ]          │
│  [ O meu pediatra ⭐ ]       │
│                             │
│  Consultas recentes         │
│  • Otite — Dra. Inês  ✓     │
│  • Febre — em resposta ⏳    │
│                             │
│  ⚠️ Emergência? → SNS 24     │
└─────────────────────────────┘
```

### W3 · Perfil da criança / Arquivo clínico
```
┌─────────────────────────────┐
│ ‹ Leo, 8 meses        [edit]│
│ ───────────────────────────│
│ Resumo de saúde             │
│  Alergias: nenhuma          │
│  Medicação: —               │
│  Médico habitual: Dra. Inês │
│ ───────────────────────────│
│ [ Vacinas ] [ Crescimento ] │
│ [ Análises ] [ Relatórios ] │
│ ───────────────────────────│
│ Episódios clínicos          │
│  • Otite — Jun 2026 (fechado)│
│  • Bronquiolite — Mar 2026  │
│ ───────────────────────────│
│ Ficheiros                   │
│  📄 analise_sangue.pdf      │
│  🖼️ erupcao.jpg             │
└─────────────────────────────┘
```

### W4 · Marketplace de pediatras
```
┌─────────────────────────────┐
│ Encontrar pediatra   [filtro]│
│ 🔎 Procurar…                │
│ Filtros: idioma·preço·rating │
│ ───────────────────────────│
│ ┌─────────────────────────┐ │
│ │ 👩‍⚕️ Dra. Inês Silva  ✅ │ │
│ │ Pediatria geral · PT/EN │ │
│ │ ⭐ 4.9 (132)            │ │
│ │ Mensagem desde 18€      │ │
│ │ Responde ~4h            │ │
│ │           [ Ver perfil ]│ │
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │ 👨‍⚕️ Dr. Tiago …    ✅   │ │
│ └─────────────────────────┘ │
└─────────────────────────────┘
```
- Badge ✅ = cédula verificada. Filtros: especialidade, idioma, preço, rating, disponibilidade.

### W5 · Perfil público do pediatra
```
┌─────────────────────────────┐
│ ‹ Dra. Inês Silva    ✅ ⭐4.9│
│ Pediatria geral             │
│ Cédula OM verificada        │
│ Idiomas: PT, EN  · 15 anos  │
│ ───────────────────────────│
│ Serviços e preços           │
│  Mensagem ........ 18€ (~4h)│
│  Vídeo 20min ..... 45€      │
│  Segunda opinião . 70€      │
│  Renovar receita . 15€      │
│ ───────────────────────────│
│ Avaliações verificadas      │
│  ⭐⭐⭐⭐⭐ "Muito atenciosa…"│
│ ───────────────────────────│
│ [ ⭐ Favorito ] [ Consultar ]│
└─────────────────────────────┘
```

### W6 · Iniciar consulta (transparência + triagem)
```
┌─────────────────────────────┐
│ Nova consulta — Dra. Inês   │
│ Criança: [ Leo ▾ ]          │
│ Tipo: [ Mensagem · 18€ ▾ ]  │
│ ───────────────────────────│
│ O que está incluído         │
│  ✓ 1 questão + esclarecim.  │
│  ✓ Resposta em ~4h úteis    │
│  ✓ Resumo final + receita   │
│  ✗ Não substitui urgência   │
│ ───────────────────────────│
│ Triagem rápida              │
│  Sintomas: [____________]   │
│  Febre: [ 38.5 ºC ]         │
│  Há quanto tempo: [ 2 dias ]│
│  Anexos: [ + foto/ficheiro ]│
│ ───────────────────────────│
│ ⚠️ Tem algum destes sinais? │
│  □ Dificuldade a respirar   │
│  □ Lábios azulados …        │
│  (se sim → encaminhar SNS24)│
│ ───────────────────────────│
│ [ Continuar para pagamento ]│
└─────────────────────────────┘
```
- Se marca sinal de alarme → interstitial forte: "Procure ajuda urgente — SNS 24 / 112" antes de prosseguir.

### W7 · Pagamento
```
┌─────────────────────────────┐
│ Pagamento                   │
│ Consulta por mensagem  18,00€│
│  • Ato médico ...... 18,00€ │
│    (isento de IVA*)         │
│ ───────────────────────────│
│ Método                      │
│  ( ) MB WAY  📱             │
│  ( ) Cartão  💳             │
│  ( ) Apple Pay              │
│ ───────────────────────────│
│ 🔒 Pagamento seguro. Só é   │
│ cobrado quando a Dra. Inês  │
│ aceitar. Reembolso total se │
│ não responder em ~4h.       │
│ ───────────────────────────│
│ [ Pagar 18,00€ ]            │
└─────────────────────────────┘
```

### W8 · Conversa / Episódio clínico
```
┌─────────────────────────────┐
│ ‹ Otite — Leo    [estado: ⏳]│
│ Dra. Inês • verificada ✅    │
│ ───────────────────────────│
│  Você 21:04                 │
│  "Tem febre e puxa a orelha"│
│  🖼️ erupcao.jpg            │
│                             │
│  Dra. Inês 21:40            │
│  "Pelos sintomas parece…    │
│   vigie a febre e…"         │
│ ───────────────────────────│
│  📋 Resumo final + receita  │
│  [ ver / descarregar ]      │
│ ───────────────────────────│
│ [ escrever… ]        [ 📎 ] │
│ ⚠️ Emergência? → SNS 24      │
└─────────────────────────────┘
```

### W9 · Agendar videochamada (Fase 2)
```
┌─────────────────────────────┐
│ Videochamada — Dra. Inês    │
│ Selecione um horário        │
│  Hoje   14:00  14:30  15:00 │
│  Amanhã 09:00  09:30  …     │
│ ───────────────────────────│
│ Duração 20min · 45€         │
│ □ Consinto a teleconsulta   │
│ [ Confirmar e pagar ]       │
└─────────────────────────────┘
```
- Antes de entrar: sala de espera + teste câmara/micro.

---

## Wireframes descritivos — App/Portal do Pediatra

### P1 · Inbox de consultas
```
┌─────────────────────────────┐
│ Consultas            [⚙️]    │
│ Filtro: Abertas ▾  SLA ▾    │
│ ───────────────────────────│
│ ⏳ Febre — Leo (8m)         │
│    Marta · há 12m · SLA 3h48│
│ ⏳ Tosse — Ana (4a)         │
│    expira em 1h ⚠️          │
│ ✓ Otite — Pedro (resp.)     │
│ ───────────────────────────│
│ Estado: ●3 abertas ●1 urgente│
└─────────────────────────────┘
```
- Ordenação por **SLA a expirar**; destaque de urgência de prazo.

### P2 · Detalhe da consulta (vista clínica)
```
┌──────────────────────────────────────────┐
│ Febre — Leo, 8 meses          [Estado ▾] │
│ ┌─────────────┬──────────────────────────┐│
│ │ Histórico   │ Conversa                 ││
│ │ Leo         │ Marta: "febre 38.5, 2d"  ││
│ │ Alergias: — │ 📎 erupcao.jpg           ││
│ │ Medic.: —   │ ───────────────────────  ││
│ │ Episódios:  │ [ Resumo AI (rascunho) ] ││
│ │ • Bronquio. │ "Lactente 8m, febre…     ││
│ │ Vacinas ✓   │  rever / editar"         ││
│ │             │ [ responder… ]      [📎] ││
│ └─────────────┴──────────────────────────┘│
│ [ Encerrar com resumo ]  [ Reembolsar ]   │
└──────────────────────────────────────────┘
```
- Resumo AI claramente marcado como **rascunho a validar**.

### P3 · Definição de serviços e preços
```
┌─────────────────────────────┐
│ Os meus serviços            │
│  Mensagem    [18€] SLA[4h]✓ │
│  Vídeo 20m   [45€]        ✓ │
│  2ª opinião  [70€]        ✓ │
│  Receita     [15€]        ☐ │
│  Follow-up   [10€] 48h    ✓ │
│ ───────────────────────────│
│ Âmbito (texto): [_________] │
│ [ Guardar ]                 │
└─────────────────────────────┘
```

### P4 · Agenda e disponibilidade (Fase 2)
```
┌─────────────────────────────┐
│ Disponibilidade             │
│ Seg  09:00–13:00  ✎         │
│ Ter  14:00–18:00  ✎         │
│ Slot: 20min · Buffer: 10min │
│ Indisponível: 24 Jun (folga)│
│ [ + adicionar ]             │
└─────────────────────────────┘
```

### P5 · Dashboard financeiro
```
┌─────────────────────────────┐
│ Finanças — Junho            │
│ Receita bruta ...... 1.240€ │
│ Comissão Pédia (20%) -248€  │
│ Líquido ............... 992€│
│ Pendente de payout ... 310€ │
│ Próximo payout: 21 Jun      │
│ ───────────────────────────│
│ Faturas  [ descarregar SAF ]│
│  • #2026/118 …  18€         │
│ ───────────────────────────│
│ [ Ver histórico ]           │
└─────────────────────────────┘
```

---

## Wireframes descritivos — Backoffice Admin

### A1 · Validação de pediatras
```
┌──────────────────────────────────────────┐
│ Pediatras · Pendentes (4)                 │
│ Nome        Cédula     ID    Estado       │
│ Inês Silva  12345  [ver] [ver] [Aprovar] │
│ Tiago …     67890  [ver] [ver] [Aprovar] │
│ [ Pedir correções ]   [ Rejeitar ]        │
└──────────────────────────────────────────┘
```

### A2 · Pagamentos, reembolsos e disputas
```
┌──────────────────────────────────────────┐
│ Transações                                │
│ ID     Pai    Pediatra  Valor  Estado  Ação│
│ #4521  Marta  Inês      18€   capturado [↩]│
│ #4522  Rui    Tiago     45€   disputa  [⚖️]│
│ Filtros: estado · método · período        │
└──────────────────────────────────────────┘
```

### A3 · Relatórios
```
┌─────────────────────────────┐
│ Visão geral — Junho         │
│ GMV ............. 28.400€    │
│ Receita líquida .. 5.680€    │
│ Conversão ........ 24%       │
│ Tempo médio resp.. 2h10      │
│ CSAT ............. 4.7/5     │
│ Reembolsos ....... 3.1%      │
└─────────────────────────────┘
```

---

## Jornadas mapeadas a ecrãs
| Jornada (doc 07) | Ecrãs |
|---|---|
| Pai cria conta | W1 |
| Pai adiciona criança | W2 → W3 |
| Pai escolhe pediatra | W4 → W5 |
| Pai inicia consulta por mensagem | W6 → W7 → W8 |
| Pai agenda videochamada | W5 → W9 |
| Pediatra responde | P1 → P2 |
| Pediatra fecha consulta | P2 (Encerrar com resumo) |
| Fatura emitida / comissão | W7/P5/A2 (automático no fecho) |
| Admin valida pediatra | A1 |
