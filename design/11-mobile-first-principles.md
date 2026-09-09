# 11 · Mobile-First Principles & Interaction Laws

**Premissa**: 95% dos utilizadores em **iPhone / Android**, smartphone-primeiro. Estas são **leis de interação** mensuráveis e verificáveis — não diretrizes vagas. Todos os ecrãs do produto ([07](07-wireframes-parent.md)–[10](10-wireframes-admin.md)) cumprem-nas; exceções estão documentadas no [doc 16 (workflow review)](16-workflow-review-redesign.md).

## Bar de qualidade (referências)
| App | O que copiamos |
|---|---|
| **Revolut** | Pagamentos como gesto trivial; transparência de valores; sheets rápidas; haptics |
| **Uber** | 1 ação primária por ecrã; estado em tempo real; mapa mental "pediste → está a acontecer" |
| **Apple Health** | Dados clínicos legíveis e calmos; gráficos compreensíveis; privacidade visível |
| **Airbnb** | Marketplace premium; cards ricos; busca/filtros fluidos; confiança visual |

## Lei 1 — Operação a uma mão (one-handed)
- **Zona do polegar** (terço inferior + centro) contém **todas** as ações primárias.
- **Navegação inferior** (tab bar) e **CTAs ancorados em baixo** acima do home indicator.
- Topo = **informação** (títulos, estado); fundo = **ação**.
- Gestos primários: **swipe-back**, **pull-to-refresh**, **swipe em listas** (favoritar/arquivar), **sheets** dispensáveis por swipe.
- Conteúdo no topo do ecrã é **alcançável** via scroll/large-title collapse; nunca exige toque no canto superior para ação crítica.
- **Verificação**: heatmap de alvos — 0 ações primárias na faixa superior (>75% da altura).

## Lei 2 — Máximo 3 toques para funções primárias
Mapa de toques (a partir de qualquer ponto via tab bar):

| Função primária | Caminho | Toques |
|---|---|---|
| Iniciar consulta | Tab **➕** → Pediatra → Consultar | **3** |
| Retomar consulta ativa | Tab 🏠 → card consulta | **2** |
| Abrir arquivo da criança | Tab 👶 → criança | **2** |
| Marcar videochamada | Tab 📅 → Marcar → slot | **3** |
| Ver fatura | Tab ⊙ → Faturas | **2** |
| Emergência (SNS 24) | Banner ⚠️ (qualquer ecrã) → Ligar | **2** |
| Pediatra: responder | Tab 📥 → consulta → escrever | **3** |
| Pediatra: ver finanças | Tab € | **1** |

**Regra**: se uma função primária exceder 3 toques, é redesenhada (ver [doc 16](16-workflow-review-redesign.md)). Funções secundárias podem usar 4+.

## Lei 3 — Funções críticas em < 5 segundos
| Função crítica | Mecanismo de acesso | Tempo-alvo |
|---|---|---|
| Emergência / SNS 24 | Banner persistente 1-toque → sheet com chamada | < 3 s |
| Retomar consulta aberta | Push deep-link **ou** card no topo da Home | < 3 s |
| Iniciar consulta | Tab central ➕ + pediatra favorito (atalho) | < 5 s |
| Login | Biometria/passkey (sem digitar) | < 2 s |
| Ver última receita | Home → consulta recente → resumo | < 5 s |
- **Atalhos do sistema**: iOS Home Screen **Quick Actions** (long-press no ícone) e Android **App Shortcuts**: "Nova consulta", "As minhas consultas", "Emergência".
- **Widgets** (Fase 2): consulta ativa + próxima vacina (Apple Health-like).

## Lei 4 — Uma ação primária por ecrã (clareza Uber)
- Cada ecrã tem **um** CTA dominante (cor/peso). Ações secundárias são discretas.
- Decisões progressivas (um passo de cada vez): triagem, pagamento, onboarding em passos curtos.

## Lei 5 — Feedback imediato e otimista (Revolut)
- **Haptics** em momentos-chave: pagamento confirmado (success), envio de consulta, erro (warning).
- **Estados otimistas** onde seguro (mensagem aparece como "a enviar"); reconciliação silenciosa.
- **Skeletons** em vez de spinners longos; nunca ecrã em branco.

## Lei 6 — Gestos como atalhos, nunca como única via
- Todo o gesto tem **equivalente tocável** (acessibilidade).
- Swipe-back + botão ‹; swipe-to-archive + ação no overflow.

## Lei 7 — Conteúdo clínico calmo e legível (Apple Health)
- Tipografia generosa (≥17pt corpo), espaço, gráficos com descrição textual.
- Privacidade sempre visível (🔒) — confiança como elemento de UI.

## Mapa de zonas de alcance (referência de layout)
```
┌─────────────────────────────┐
│  ZONA FRIA (info, títulos)  │  topo: large title, estado, 🔒
│                             │
│  ZONA NEUTRA (conteúdo)     │  scroll, cards, listas
│                             │
│  ZONA QUENTE (polegar) 👍   │  CTAs primários, composer
│  [   Ação primária      ]   │
│  🏠  👶  ➕  📅  ⊙          │  tab bar
└─────────────────────────────┘
```

## Critérios de aceitação (testáveis em QA)
- [ ] Toda função primária ≤ 3 toques (matriz acima validada em build).
- [ ] 0 ações primárias na zona fria.
- [ ] Emergência acessível em ≤ 3 s de qualquer ecrã.
- [ ] Login biométrico/passkey < 2 s.
- [ ] Quick Actions/App Shortcuts presentes.
- [ ] Haptics nos 4 momentos-chave.
