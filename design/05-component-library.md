# 05 · Component Library

Componentes adaptativos (iOS/Android) construídos sobre os [tokens](04-design-system-foundations.md). Cada componente: anatomia, variantes, estados, acessibilidade.

## Princípios
- **Adaptive by default**: aparência nativa por plataforma, comportamento e tokens partilhados.
- **Estados completos**: default, hover (web), pressed, focus, disabled, loading, error, empty.
- **Acessível por construção**: roles, labels, foco, contraste AA, alvo ≥44/48.

---

## Ações

### Button
- Variantes: `primary` (pill, brand), `secondary` (outline), `tertiary` (texto), `destructive` (danger), `pay` (com ícone MB WAY/Apple Pay/Google Pay).
- Tamanhos: `lg` (CTA, full-width, bottom-anchored), `md`, `sm`.
- Estados: default/pressed/disabled/loading (spinner + label "A processar…").
- A11y: label claro; alvo ≥44/48; `accessibilityRole=button`; haptic ao premir.

### FAB / Ação central "Consultar"
- Separador central elevado na tab bar do pai; ícone ➕; sempre alcançável.

### Pay Button (Apple Pay / Google Pay / MB WAY)
- Usa os componentes **nativos oficiais** (Apple Pay / Google Pay sheets) — requisito de plataforma; MB WAY com branding aprovado.

---

## Entradas

### Text Field / Form Row
- Label persistente, placeholder, helper/error text, ícone opcional.
- Tipos: texto, número (teclado adequado), data (date picker nativo), seletor.
- Estados: focus (anel brand), error (border danger + mensagem + ícone), disabled.
- A11y: label associado; erro anunciado (live region); `keyboardType` correto.

### OTP Input
- Campos segmentados; auto-advance; paste de SMS (iOS one-time-code).

### Picker / Dropdown / Segmented Control
- Nativos (`UIPickerView`/Material). Segmented para sub-vistas (Ativas/Histórico).

### Toggle / Checkbox / Radio
- Consentimentos usam checkbox com texto legal legível; estado claro.

### Search Bar + Filter Chips
- Marketplace: search no topo, chips de filtro roláveis (idioma, preço, rating, disponibilidade), bottom sheet de filtros avançados.

### File Picker / Uploader
- Tile de upload (câmara/galeria/ficheiro); preview com thumbnail; progresso; estado "a verificar" (scan); erro se infetado/inválido.

---

## Conteúdo & Listas

### Card
- Variantes: `child` (avatar + nome + idade), `pediatrician` (foto + badge ✅ + rating + preço + SLA), `consultation` (estado + criança + última msg + SLA), `file`, `invoice`, `metric` (KPI).
- Elevação 1; raio md; toda a área tocável.

### List Row
- Leading (avatar/ícone) · título · subtítulo · trailing (chevron/estado/valor).
- Swipe actions: favoritar, arquivar (com confirmação para destrutivo).

### Avatar
- Criança (iniciais/emoji/foto), pediatra (foto), com badge de verificação ✅.

### Badge / Status Pill
- Estados de consulta: `aberta`(info) `em triagem`(âmbar) `respondida`(verde) `encerrada`(neutro) `expira em…`(âmbar+relógio).
- Cor + ícone + texto (nunca só cor).

### Tag / Chip
- Idiomas, especialidades, alergias; removível em edição.

### Empty State
- Ilustração + título + 1 CTA. Ex.: "Ainda não tens crianças. Adiciona a primeira."

### Skeleton / Loading
- Skeletons em listas; evita spinners longos; otimista onde seguro.

---

## Clínicos / Domínio

### Triage Form
- Passos: sintomas, febre (stepper ºC), duração, sinais de alarme (checklist), anexos.
- **Red-flag interstitial**: se marca sinal → ecrã de encaminhamento (SNS 24/112) antes de continuar.

### Scope & Price Card
- "O que está incluído / não incluído", preço, SLA, antes do pagamento. Transparência total.

### Growth Chart
- Curvas de percentil (OMS); ponto da criança; acessível (descrição textual + valores tabulares).

### Vaccine Timeline
- Linha temporal PNV; estados (feita/em falta/agendada).

### Message Bubble
- Pai vs pediatra; anexos inline; timestamp; estado entregue/lido; **conteúdo IA marcado** ("rascunho").

### Consultation Summary
- Resumo clínico + recomendações + "quando procurar urgência" + receita (download).

### AI Draft Banner (pediatra)
- Bloco distinto "Rascunho gerado por IA — rever e validar"; botões editar/aprovar.

---

## Navegação & Estrutura

### Tab Bar (mobile) / Sidebar (web)
- Tab bar: 4–5 itens, badges; central elevado (pai).
- Sidebar: grupos colapsáveis (clínica/admin).

### Nav Bar / App Bar
- Large title (iOS) / top app bar (Android); ações no fundo quando primárias.

### Sheet / Bottom Sheet / Modal
- Tarefas focadas; grabber; dismiss por swipe; foco preso (focus trap) p/ a11y.

### Banner — Safety
- Persistente discreto "⚠️ Emergência? → SNS 24"; abre sheet com 808 24 24 24 / 112.

### Toast / Snackbar / Inline Alert
- Sucesso/erro/info; nunca para erros críticos de pagamento (usar inline + bloqueio).

---

## Feedback & Estado
| Componente | Uso |
|---|---|
| Progress bar | Onboarding/verificação do pediatra |
| Spinner | Processamento de pagamento |
| Stepper | Triagem multi-passo |
| Confirmation dialog | Ações destrutivas/irreversíveis |
| Rating stars | Avaliação verificada pós-consulta |

## Acessibilidade transversal (todos os componentes)
- VoiceOver/TalkBack: ordem lógica, labels, hints, agrupamento.
- Dynamic Type/Font scale até 200% sem quebra.
- Foco visível; navegação por teclado (web); `reduce motion` respeitado.
- Targets ≥44/48; contraste AA; estados não só por cor.
