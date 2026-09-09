# 07 · Wireframes & Screens — PAI (Parent)

Mobile-first, uma mão, WCAG AA. Cada ecrã: wireframe + **Screen description** (objetivo · elementos · estados · a11y · ação primária).

---

## P-01 · Welcome / Onboarding
```
┌─────────────────────────────┐
│                             │
│        [ ilustração ]       │
│                             │
│   O pediatra de confiança,  │
│   à distância de uma        │
│   mensagem.                 │
│                             │
│   • Pediatras verificados   │
│   • Seguro e privado 🔒     │
│   • Sem ir à urgência       │
│                             │
│                             │
│  [  Começar  ]              │
│  Já tenho conta · Entrar    │
└─────────────────────────────┘
```
**Description** · *Objetivo*: comunicar valor e tranquilizar em 3s. *Elementos*: ilustração calma, headline, 3 provas, CTA. *Estados*: carrossel de 2–3 slides (swipe). *A11y*: headline como heading; CTA ≥44/48; reduce-motion desliga auto-advance. *Ação primária*: **Começar**.

## P-02 · Sign in / Sign up
```
┌─────────────────────────────┐
│ ‹                           │
│   Entrar ou criar conta     │
│                             │
│  [  Continuar com Apple  ]  │
│  [  Continuar com Google ]  │
│  ───────  ou  ───────       │
│  [  Telefone            ]   │
│  [  Email               ]   │
│  [  🔑 Usar passkey      ]  │
│                             │
│  🔒 Os teus dados são       │
│  encriptados.               │
│                             │
│  Ao continuar aceitas os    │
│  Termos e a Privacidade.    │
└─────────────────────────────┘
```
**Description** · *Objetivo*: registo sem fricção. *Elementos*: Apple/Google (botões nativos), telefone, email, passkey. *Estados*: loading por método; erro inline. *A11y*: ordem lógica; labels; links legais focáveis. *Ação primária*: método social (1-toque).

## P-03 · Verificação OTP
```
┌─────────────────────────────┐
│ ‹  Confirma o teu número    │
│                             │
│  Enviámos um código para    │
│  +351 9•• ••• 123           │
│                             │
│   ▢  ▢  ▢  ▢  ▢  ▢          │
│                             │
│  Reenviar em 0:28           │
│                             │
│  [  Confirmar  ]            │
└─────────────────────────────┘
```
**Description** · OTP segmentado, auto-advance, autofill SMS. *Estados*: erro (shake + msg), reenvio com contador. *A11y*: campos rotulados; código anunciado. *Ação*: **Confirmar** (auto ao 6º dígito).

## P-04 · Consentimentos (Termos + Privacidade + Saúde)
```
┌─────────────────────────────┐
│ Antes de começar 🔒         │
│                             │
│ ☐ Aceito os Termos de Uso   │
│   [ler]                     │
│ ☐ Li a Política de          │
│   Privacidade [ler]         │
│ ☐ Autorizo o tratamento dos │
│   dados de saúde do meu     │
│   filho (necessário) [+info]│
│ ☐ (Opcional) Receber dicas  │
│   e novidades               │
│                             │
│  Podes alterar isto a       │
│  qualquer momento.          │
│                             │
│  [  Continuar  ]            │
└─────────────────────────────┘
```
**Description** · Consentimento granular, versionado. *Estados*: CTA ativo só com obrigatórios marcados; sheets de detalhe legal. *A11y*: checkbox com texto completo associado; "necessário/opcional" explícito. *Ação*: **Continuar**.

## P-05 · Home / Família (Tab Início)
```
┌─────────────────────────────┐
│ Olá, Marta 👋          ⊙    │
│                             │
│ As tuas crianças            │
│ ┌────┐ ┌────┐ ┌──────┐      │
│ │ 👶 │ │ 🧒 │ │  +   │      │
│ │Leo │ │Ana │ │Add.  │      │
│ └────┘ └────┘ └──────┘      │
│                             │
│ Em curso                    │
│ ┌─────────────────────────┐ │
│ │ Febre — Leo  ⏳ respondida│ │
│ │ Dra. Inês · toca p/ ver  │ │
│ └─────────────────────────┘ │
│                             │
│ Sugestões                   │
│ • Vacina dos 12m do Leo 📅  │
│                             │
├─────────────────────────────┤
│ 🏠   👶   ➕   📅   ⊙       │
└─────────────────────────────┘
```
**Description** · *Objetivo*: estado da família num relance + retomar consultas. *Elementos*: saudação, carrossel de crianças, consultas em curso, sugestões proativas (vacinas/crescimento), tab bar. *Estados*: empty (sem crianças → CTA), badges de consulta. *A11y*: cartões como botões com label completo. *Ação*: retomar consulta / **➕ Consultar**.

## P-06 · Adicionar criança
```
┌─────────────────────────────┐
│ ‹  Nova criança    (1/2)    │
│                             │
│ Nome                        │
│ [___________________]       │
│ Data de nascimento          │
│ [  selecionar data  ]       │
│ Género                      │
│ ( ) F   ( ) M   ( ) Outro   │
│                             │
│ 🔒 Estes dados são privados │
│ e encriptados.              │
│                             │
│  [  Continuar  ]            │
└─────────────────────────────┘
```
```
┌─────────────────────────────┐
│ ‹  Saúde do Leo    (2/2)    │
│ Alergias        [ + add ]   │
│ Medicação atual [ + add ]   │
│ Doenças conhecidas [+ add]  │
│ Médico habitual [_______]   │
│                             │
│ ☐ Confirmo ser responsável  │
│   legal por esta criança    │
│  [  Criar arquivo  ]        │
└─────────────────────────────┘
```
**Description** · Form progressivo (2 passos), guarda automático. *Estados*: validação inline; date picker nativo. *A11y*: campos opcionais marcados; teclado adequado. *Ação*: **Criar arquivo** (liga ao consentimento de saúde por criança).

## P-07 · Perfil da criança (arquivo)
```
┌─────────────────────────────┐
│ ‹  Leo · 8 meses       ✎    │
│                             │
│ Resumo de saúde             │
│  Alergias: nenhuma          │
│  Medicação: —               │
│  Médico: Dra. Inês          │
│                             │
│ ┌────────┐ ┌────────┐       │
│ │💉Vacinas│ │📈Cresc.│       │
│ └────────┘ └────────┘       │
│ ┌────────┐ ┌────────┐       │
│ │📄Files │ │🗂Episód│       │
│ └────────┘ └────────┘       │
│                             │
│ Episódios recentes          │
│ • Otite — Jun 2026 ✓        │
│                             │
│  [  Consultar sobre o Leo ] │
└─────────────────────────────┘
```
**Description** · Hub da criança. *Elementos*: resumo, 4 tiles (vacinas/crescimento/ficheiros/episódios), episódios, CTA contextual. *Estados*: editar (✎). *A11y*: tiles como botões; valores legíveis. *Ação*: **Consultar sobre o Leo**.

## P-08 · Vacinas / P-09 · Crescimento / P-10 · Ficheiros / P-11 · Episódios
```
VACINAS                       CRESCIMENTO
┌───────────────┐             ┌───────────────┐
│ ‹ Vacinas Leo │             │ ‹ Crescimento │
│ PNV           │             │  Peso · Altura│
│ ✓ Nascença    │             │   ╱╲    P50    │
│ ✓ 2 meses     │             │  ╱  ╲___●      │
│ ● 12 meses 📅 │             │ ____________   │
│   (a agendar) │             │ Peso 8.4kg P55 │
│ [+ registar]  │             │ Alt. 70cm  P60 │
└───────────────┘             └───────────────┘

FICHEIROS                     EPISÓDIOS
┌───────────────┐             ┌───────────────┐
│ ‹ Ficheiros   │             │ ‹ Episódios   │
│ [+ carregar]  │             │ • Otite Jun ✓ │
│ 📄 analise.pdf│             │ • Bronquiol.  │
│  ✓ verificado │             │   Mar 2026    │
│ 🖼 erupcao.jpg│             │ Toca p/ ver   │
│ 🎬 video.mp4  │             │ conversa+files│
│  ⏳ a verificar│             └───────────────┘
└───────────────┘
```
**Description** · *Vacinas*: timeline PNV com estados. *Crescimento*: gráfico de percentis + valores tabulares (a11y). *Ficheiros*: upload com estado de scan (a verificar/verificado/rejeitado), preview. *Episódios*: agrupador clínico. *A11y*: gráfico com descrição textual e tabela; ficheiros com tipo/estado anunciados.

## P-12 · Marketplace (procurar pediatra) — Tab ➕
```
┌─────────────────────────────┐
│  Encontrar pediatra         │
│ 🔎 Procurar…                │
│ [PT][EN] [€-€€€] [⭐4+] [Já]│
│                             │
│ ┌─────────────────────────┐ │
│ │ ⊙ Dra. Inês Silva    ✅ │ │
│ │ Pediatria geral · PT/EN │ │
│ │ ⭐ 4.9 (132) · ~4h      │ │
│ │ Mensagem desde 18€      │ │
│ │            [ Ver perfil ]│ │
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │ ⊙ Dr. Tiago …      ✅   │ │
│ └─────────────────────────┘ │
│                             │
│ ⚠️ Emergência? → SNS 24     │
└─────────────────────────────┘
```
**Description** · Diretório com search + filter chips (idioma/preço/rating/disponibilidade) + bottom sheet de filtros avançados. *Estados*: loading skeleton, empty ("sem resultados — ajusta filtros"). *A11y*: badge ✅ com label "cédula verificada"; cards tocáveis. *Ação*: **Ver perfil**.

## P-13 · Perfil do pediatra
```
┌─────────────────────────────┐
│ ‹  ⊙ Dra. Inês Silva  ✅ ⭐4.9│
│ Pediatria geral             │
│ Cédula OM verificada 🔒     │
│ PT · EN · 15 anos exp.      │
│ ───────────────────────────│
│ Serviços                    │
│  💬 Mensagem .... 18€ ~4h   │
│  🎥 Vídeo 20m ... 45€       │
│  🔁 Renovar receita 15€     │
│  🧠 2ª opinião .. 70€       │
│ ───────────────────────────│
│ Avaliações verificadas      │
│  ⭐⭐⭐⭐⭐ "Muito atenciosa"  │
│ ───────────────────────────│
│  ⭐ Favorito    [ Consultar ]│
└─────────────────────────────┘
```
**Description** · Confiança + serviços + preços + avaliações. *Estados*: indisponível (mostra próxima disponibilidade). *A11y*: lista de serviços com preço/SLA legível. *Ação*: **Consultar** (ou favoritar).

## P-14 · Iniciar consulta (tipo + âmbito)
```
┌─────────────────────────────┐
│ ‹  Consultar — Dra. Inês    │
│ Criança  [ Leo ▾ ]          │
│ Tipo  [ 💬 Mensagem · 18€ ▾]│
│ ───────────────────────────│
│ Incluído ✓                  │
│  • 1 questão + esclarecim.  │
│  • Resposta em ~4h úteis    │
│  • Resumo + receita         │
│ Não incluído ✗              │
│  • Não substitui urgência   │
│ ───────────────────────────│
│  [  Continuar  ]            │
└─────────────────────────────┘
```
**Description** · Scope & Price Card — transparência **antes** de pagar. *A11y*: seletor de criança/tipo nativos; incluído/excluído como listas. *Ação*: **Continuar** → Triagem.

## P-15 · Triagem estruturada
```
┌─────────────────────────────┐
│ ‹  Sobre o Leo   (triagem)  │
│ O que se passa?             │
│ [_________________________] │
│ Febre?  [ 38.5 ºC  −  + ]   │
│ Há quanto tempo?            │
│ [ 2 dias ▾ ]                │
│ Anexos  [ 📎 foto/ficheiro ]│
│ ───────────────────────────│
│ Algum destes sinais?        │
│ ☐ Dificuldade a respirar    │
│ ☐ Lábios/pele azulados      │
│ ☐ Prostração / não acorda   │
│                             │
│  [  Rever e pagar  ]        │
└─────────────────────────────┘
```
**Description** · Estrutura a questão (admin, não diagnóstico). *Estados*: ao marcar sinal de alarme → **P-16 interstitial**. *A11y*: stepper de febre com valor anunciado; checklist clara. *Ação*: **Rever e pagar**.

## P-16 · Aviso de segurança (red flag)
```
┌─────────────────────────────┐
│        ⚠️  (vermelho)        │
│   Estes sinais podem ser     │
│   graves.                   │
│                             │
│   Não esperes por uma       │
│   resposta online.          │
│                             │
│  [  Ligar SNS 24 (808…) ]   │
│  [  Ligar 112           ]   │
│  ───────────────────────    │
│  Compreendo e quero mesmo   │
│  continuar online           │
└─────────────────────────────┘
```
**Description** · Interstitial de segurança clínica. *Objetivo*: encaminhar emergências sem bloquear definitivamente. *A11y*: cor + ícone + texto; botões de chamada diretos. *Ação primária*: **Ligar SNS 24**.

## P-17 · Pagamento
```
┌─────────────────────────────┐
│ ‹  Pagamento                │
│ Mensagem · Dra. Inês        │
│  Ato médico ....... 18,00€  │
│   (isento de IVA*)          │
│  Total ............ 18,00€  │
│ ───────────────────────────│
│ Método                      │
│  ( ) MB WAY 📱              │
│  ( ) Apple Pay              │
│  ( ) Cartão 💳              │
│ ───────────────────────────│
│ 🔒 Só é cobrado quando a    │
│ Dra. responder. Reembolso   │
│ total se não responder.     │
│  [  Pagar 18,00€  ]         │
└─────────────────────────────┘
```
**Description** · Pré-pagamento com garantia. *Estados*: processing (spinner), erro (inline + retry), MB WAY (aguarda push do banco). *A11y*: Apple Pay/Google Pay nativos; valores tabulares. *Ação*: **Pagar**.

## P-18 · Conversa (chat / episódio)
```
┌─────────────────────────────┐
│ ‹ Febre — Leo   ⏳ respondida│
│ ⊙ Dra. Inês ✅              │
│ ───────────────────────────│
│            Você 21:04 ▕     │
│   "Tem febre e puxa a orelha"│
│   🖼 erupcao.jpg            │
│                             │
│ ▏Dra. Inês 21:40            │
│  "Pelos sintomas parece…    │
│   vigia a febre e…"         │
│ ───────────────────────────│
│ 📋 Resumo + receita [ver]   │
│ ───────────────────────────│
│ [ escrever…        ] 📎  ➤  │
│ ⚠️ Emergência? → SNS 24     │
└─────────────────────────────┘
```
**Description** · Conversa por episódio. *Elementos*: bolhas, anexos, estado, resumo/receita, composer, banner de segurança. *Estados*: aberta (SLA timer), respondida, encerrada (composer fecha após janela de reabertura). *A11y*: bolhas com autor/hora; anexos rotulados. *Ação*: enviar mensagem.

## P-19 · Resumo & receita
```
┌─────────────────────────────┐
│ ‹  Resumo da consulta       │
│ Leo · Otite · 12 Jun 2026   │
│ Dra. Inês Silva ✅          │
│ ───────────────────────────│
│ Avaliação                   │
│  [texto clínico]            │
│ Recomendações               │
│  • …                        │
│ Quando procurar urgência    │
│  • …                        │
│ ───────────────────────────│
│ 📄 Receita.pdf   [download] │
│ 🧾 Fatura        [download] │
│  [  Avaliar a Dra. Inês  ]  │
└─────────────────────────────┘
```
**Description** · Resumo validado pelo médico + receita + fatura. *A11y*: secções com headings; downloads rotulados. *Ação*: **Avaliar** (estrelas + comentário, verificada).

## P-20 · Agendar videochamada (Tab Agenda)
```
┌─────────────────────────────┐
│ ‹ Vídeo — Dra. Inês         │
│ Escolhe um horário          │
│ Hoje   [14:00][14:30][15:00]│
│ Amanhã [09:00][09:30] …     │
│ ───────────────────────────│
│ 20 min · 45€                │
│ ☐ Consinto a teleconsulta   │
│  [  Confirmar e pagar  ]    │
└─────────────────────────────┘
```
**Description** · Slots por disponibilidade; consentimento de teleconsulta; pagamento na marcação. *A11y*: slots como botões com hora/estado. *Ação*: **Confirmar e pagar**.

## P-21 · Sala de espera / P-22 · Em chamada / P-23 · Pós-consulta
```
SALA DE ESPERA          EM CHAMADA              PÓS
┌────────────┐          ┌────────────┐          ┌────────────┐
│ A Dra. vai │          │  [ vídeo ] │          │ Obrigada!  │
│ admitir-te │          │            │          │ Resumo a   │
│ em breve.  │          │  ⊙ self    │          │ caminho 📋 │
│ 🎤 ✓ 📷 ✓  │          │ 🎤 📷 ⤢ ☎  │          │ [Ver resumo]│
│ Testar A/V │          │ (controles)│          │ [Avaliar]  │
└────────────┘          └────────────┘          └────────────┘
```
**Description** · *Espera*: verificação A/V antes de entrar (remove pânico técnico). *Chamada*: full-screen landscape, controlos grandes, sem gravação (indicador se ativada). *Pós*: confirmação + resumo + avaliação. *A11y*: controlos rotulados; legendas/transcrição se disponível.

## P-24 · Conta · P-25 · Faturas · P-26 · Subscrição · P-27 · Privacidade & Dados (RGPD)
```
CONTA                   PRIVACIDADE & DADOS 🔒
┌───────────────┐       ┌─────────────────────┐
│ ‹ Conta       │       │ ‹ Privacidade       │
│ ⊙ Marta       │       │ Os teus direitos:   │
│ Família       │       │ [ Aceder aos dados ]│
│ 🧾 Faturas    │       │ [ Exportar (RGPD) ] │
│ ⭐ Subscrição  │       │ [ Eliminar conta  ] │
│ 🔔 Notificações│       │ Consentimentos      │
│ 🔒 Privacidade │       │  Saúde Leo ✓ [gerir]│
│ ❓ Ajuda·SNS24 │       │  Marketing  ✗       │
│ [ Terminar sessão ]   │ Auditoria de acessos│
└───────────────┘       │  [ ver registo ]    │
                        └─────────────────────┘
```
**Description** · *Conta*: hub de definições. *Faturas*: lista descarregável. *Subscrição*: planos família, gerir/cancelar. *Privacidade*: **direitos RGPD self-service** (aceder/exportar/eliminar), gestão de consentimentos por criança, registo de acessos (transparência). *A11y*: ações destrutivas (eliminar) com confirmação + reautenticação. *Ação*: conforme contexto.

---

### Mapa de cobertura (Pai)
Onboarding (P01–04) · Família/Crianças (P05–11) · Marketplace/Consulta (P12–19) · Vídeo (P20–23) · Conta/Privacidade/Faturação (P24–27). Estados transversais: **empty, loading, error, offline, success** definidos no [doc 05](05-component-library.md).
