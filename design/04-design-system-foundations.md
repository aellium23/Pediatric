# 04 · Design System — Foundations

**"Pédia Design Language"** — premium, calmo, clínico, humano. Tokens partilhados entre iOS e Android; aparência adaptada por plataforma.

## Princípios
- **Calm clinical**: muito branco, cor com propósito, sem ruído.
- **Soft & safe**: cantos arredondados, sombras suaves, ilustração humana inclusiva.
- **Token-driven**: tudo (cor, tipo, espaço, raio, elevação, movimento) é um token → consistência e theming (claro/escuro, multi-marca para clínicas).

---

## Cor

### Filosofia
Azul-petróleo sereno (confiança/clínico) + verde suave (saúde/positivo) + acento quente (humano). Vermelho **reservado** para segurança clínica e erros — nunca decorativo.

### Paleta base (light)
| Token | Hex | Uso |
|---|---|---|
| `brand/primary` | `#1E6E6A` (teal profundo) | Marca, CTAs primários |
| `brand/primary-tint` | `#2E8F8A` | Estados hover/pressed |
| `brand/secondary` | `#3DA35D` (verde saúde) | Sucesso, confirmações, saúde |
| `accent/warm` | `#F2A65A` (âmbar suave) | Destaques humanos, ilustração |
| `bg/canvas` | `#FFFFFF` | Fundo principal |
| `bg/surface` | `#F6F8F8` | Cartões, agrupamentos |
| `bg/elevated` | `#FFFFFF` + sombra | Sheets, modais |
| `text/primary` | `#0F2E2C` | Texto principal |
| `text/secondary` | `#5B6B6A` | Texto de apoio |
| `text/tertiary` | `#8A9A99` | Placeholders, metadados |
| `border/subtle` | `#E2E8E8` | Separadores |
| `state/success` | `#2E8B57` | OK / SLA cumprido |
| `state/warning` | `#E8A317` | Atenção / SLA a expirar |
| `state/danger` | `#D7263D` | **Segurança clínica / erro** |
| `state/info` | `#2E6FB0` | Informação |

### Paleta escura (dark mode — nativo iOS/Android)
| Token | Hex |
|---|---|
| `bg/canvas` | `#0C1413` |
| `bg/surface` | `#13201F` |
| `text/primary` | `#EAF2F1` |
| `brand/primary` | `#3FA8A2` (mais claro p/ contraste) |
- Semânticos mantêm-se; ajuste de luminância para **contraste AA** em ambos os temas.

### Acessibilidade de cor (WCAG AA)
- Texto normal **≥ 4.5:1**, texto grande **≥ 3:1**, ícones/limites de UI **≥ 3:1**.
- **Cor nunca é o único indicador** (estado também por ícone + texto). Ex.: SLA a expirar = âmbar + ícone relógio + "expira em 1h".
- Testado para deuteranopia/protanopia (vermelho↔verde não dependem só de matiz).

---

## Tipografia

### Famílias (native-first)
- **iOS**: **SF Pro** (Text/Display) — Dynamic Type nativo.
- **Android**: **Roboto** (Material 3) — escala tipográfica Material.
- **Display de marca** (opcional, headers de marketing/onboarding): uma grotesca humanista (ex.: *Inter* ou tipo personalizado) — usada com parcimónia.
- Números: tabular para finanças/percentis (alinhamento).

### Escala (pt — escala iOS; mapeia a Material type scale no Android)
| Token | Tamanho/Peso | Uso |
|---|---|---|
| `display` | 34 / Bold | Onboarding, títulos de marca |
| `largeTitle` | 28 / Bold | Título de ecrã (large title iOS) |
| `title1` | 22 / Semibold | Secções |
| `title2` | 20 / Semibold | Cabeçalhos de cartão |
| `headline` | 17 / Semibold | Ênfase em listas |
| `body` | 17 / Regular | Corpo padrão |
| `callout` | 16 / Regular | Texto secundário |
| `subhead` | 15 / Regular | Metadados |
| `footnote` | 13 / Regular | Notas, legais |
| `caption` | 12 / Regular | Etiquetas, timestamps |

### Regras tipográficas
- **Dynamic Type / Font Scale** suportado até tamanhos de acessibilidade (layouts não quebram; testar a 200%).
- Comprimento de linha confortável; altura de linha ~1.3–1.4.
- **Mínimo 17pt** para corpo clínico (legibilidade para pais cansados/idosos cuidadores).
- Hierarquia por **peso e tamanho**, não por cor.

---

## Espaçamento & Grid
- **Base 4 / passo 8** (4, 8, 12, 16, 20, 24, 32, 40).
- Margens de ecrã: **16–20pt** (mobile).
- Grid de conteúdo: 1 coluna (mobile), até 12 colunas (web/tablet — [doc 06](06-responsive-behavior.md)).
- **Touch targets**: ≥ **44×44pt** (iOS) / **48×48dp** (Android); espaçamento mínimo 8pt entre alvos.

## Raio & Elevação
| Token | Valor | Uso |
|---|---|---|
| `radius/sm` | 8 | Chips, inputs |
| `radius/md` | 12 | Cartões |
| `radius/lg` | 20 | Sheets, cartões grandes |
| `radius/pill` | 999 | Botões pill, badges |
| `elevation/1` | sombra suave y2 blur8 8% | Cartões |
| `elevation/2` | y8 blur24 12% | Sheets/modais |
- iOS: sombras subtis + materiais translúcidos (blur). Android: elevação Material (tonal + sombra).

## Iconografia
- **iOS**: SF Symbols (peso alinhado ao texto). **Android**: Material Symbols.
- Conjunto custom de marca para conceitos clínicos (vacina, crescimento, episódio) — estilo *rounded, 2px stroke*, consistente.
- Ícones sempre acompanhados de label ou `accessibilityLabel`.

## Movimento
- **Propósito > decoração**: transições comunicam hierarquia (push, sheet up).
- Durações 200–350ms, curvas ease nativas; **respeita "Reduce Motion"** (desliga parallax/animações não essenciais).
- **Haptics** (iOS) / feedback tátil (Android) em ações-chave: pagamento confirmado, consulta enviada, erro.

## Ilustração & Imagem
- Ilustrações humanas, diversas e inclusivas (famílias variadas); tom quente, não infantilizado.
- Fotos de pediatras reais (perfis) com tratamento consistente.
- **Sem** imagens clínicas perturbadoras em contextos promocionais.

## Tom de voz (UX writing)
- Seguro, humano, claro, tranquilizador. Frases curtas. Sem alarmismo, sem jargão.
- Exemplos: "Recebemos a sua questão." · "Só pagas quando a Dra. responder." · "Se notares [sinais], não esperes: liga SNS 24."

## Theming
- **Claro/escuro** nativo. **Multi-marca** (white-label clínicas — cor primária + logo trocáveis via tokens). **High-contrast** mode.
