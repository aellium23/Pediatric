# 23 · Design System (web) e lacunas de UX

Documenta o sistema visual da app web (`apps/web`) após o redesign, alinhado com
os princípios do doc 19 (premium, mobile-first, limpo) e com a referência pedida
pelo fundador: **estilo Instagram** (limpo, monocromático, ícones de linha,
listas com divisórias finas).

## Princípios
- **Mobile-first**, muito espaço em branco, hierarquia clara.
- **Monocromático + 1 acento de marca** (teal). Texto quase-preto, secundário cinza.
- **Ícones de linha** (SVG, `stroke`) — sem emojis decorativos.
- **Listas estilo Instagram** (linhas com avatar/ícone + chevron + divisória fina).
- **Barra inferior fixa, só ícones** (ativo a preto/realce, inativo cinza).
- **Acessibilidade**: alvos de toque ≥44px, contraste, tamanho de texto ajustável.

## Tokens (CSS variables — `globals.css`)
| Token | Claro | Escuro |
|---|---|---|
| `--bg` | #fafafa | #0c1413 |
| `--surface` | #ffffff | #16201f |
| `--fill` (inputs/seg) | #efefef | #1f2c2a |
| `--border` | #dbdbdb | #283633 |
| `--text` | #10211f | #eef4f3 |
| `--muted` | #6b7a78 | #93a3a0 |
| `--brand` | #0e7c74 | #2bb3a6 |
| `--radius` / `--radius-sm` | 14px / 10px | — |

## Componentes
- **Botões**: `.btn` (primário teal), `.secondary` (fill), `.danger`; cantos 10px,
  alvo 44px, feedback de toque.
- **Cartões**: `.card` flat (borda fina, sem sombra). `button.card` herda cor do texto.
- **Listas**: `.list` + `.lrow` + `.avatar` + `.chev`.
- **Barra**: `.appbar` (fixa) + `TabIcon` (ícones de linha, `active` mais forte).
- **Segmented control**: `.seg` (usado nas Definições).
- **Pills/badges**: estados (ok/warn/muted).

## Temas e preferências
- **Tema**: Claro / Escuro / **Sistema** (segue `prefers-color-scheme`). Persistido em
  `localStorage` (`pedia_theme`); aplicado via `data-theme` no `<html>` (`lib/theme.tsx`).
- **Tamanho do texto**: Normal / Grande (`data-text`).
- **Idioma**: PT / EN / ES (`lib/i18n.tsx`).
- Tudo concentrado no ecrã **Definições** (ícone de engrenagem no topo do `/app`).

## Lacunas de UX por implementar (vs plano doc 19 + roadmap doc 15)
Ordenadas por valor; as marcadas ✅ já entraram com este trabalho.

| Item | Estado | Notas |
|---|---|---|
| Tema escuro/claro/sistema | ✅ | `lib/theme.tsx` |
| Tamanho de texto (a11y) | ✅ | Definições |
| i18n PT/EN/ES | ✅ | Fase K |
| Ecrã de Definições | ✅ | engrenagem no topo |
| Acesso rápido **"Emergência? → SNS 24 / 112"** sempre presente | ✅ | botão SOS fixo + bottom sheet com `tel:` |
| **Chat em bolhas** (estilo messaging) no thread de consulta | ✅ | bolhas me/them (alinhamento por JWT `sub`) |
| **Pesquisa** no marketplace (campo de busca) | ✅ | busca por especialidade/idioma/bio |
| **Onboarding/consentimentos** com ecrãs próprios | ⏳ | hoje consentimento inline |
| **Biometria / Passkeys** no login (backend já suporta) | ⏳ | falta UI WebAuthn |
| **Preferências de notificações** (UI) | ✅ | toggle nas Definições; push real precisa de credenciais |
| **PWA instalável** (manifest + theme-color + ícone) | ✅ | `app/manifest.ts` + `viewport.themeColor`; falta service worker p/ offline total |
| **Acessibilidade** (focus-visible, prefers-reduced-motion) | ✅ | base; auditoria AA completa fica pendente |
| **Estados vazios** + **skeleton loaders** | ✅ | `Skeleton`/`EmptyState`; aplicados às listas principais |
| **Offline total** (service worker) + deep links | ⏳ | PWA avançado |
| **Onboarding/consentimentos** com ecrãs próprios | ⏳ | hoje inline |

> O backlog de **produto** (integrações reais, app nativa, faturação certificada,
> DPIA) está em `docs/STATUS-fases.md` e `docs/21-integracoes.md`.

## Onde está no código
- `apps/web/lib/theme.tsx` — tema + tamanho de texto.
- `apps/web/lib/i18n.tsx` — idiomas.
- `apps/web/app/globals.css` — tokens e componentes.
- `apps/web/app/app/page.tsx` — `TabIcon`, `SettingsScreen`, listas, barra.
