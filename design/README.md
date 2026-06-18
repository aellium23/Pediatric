# Pédia — UX/UI Design System & Screens

> **Design completo da plataforma**, na perspetiva de um Senior Product Designer (Apple).
> Mobile-first · iPhone-first **e** Android-first (native feel em ambos) · operação a uma mão · **WCAG 2.2 AA** · premium · simples para pais não-técnicos.
> Baseado no [blueprint de produto](../docs/19-ux-ui-wireframes.md) e [arquitetura](../architecture/README.md). **Sem código.**

## Filosofia de design

Herdamos os princípios da Apple HIG — **Clarity, Deference, Depth** — e adaptamos a Material 3 no Android, mantendo **uma só alma de marca** em ambas as plataformas via Flutter adaptativo.

| Princípio | Como se aplica na Pédia |
|---|---|
| **Clarity** | Conteúdo clínico legível, hierarquia óbvia, um objetivo por ecrã, zero jargão |
| **Deference** | A UI serve o conteúdo (a criança, a conversa, o pediatra); cromados discretos |
| **Depth** | Camadas e transições que comunicam navegação e tranquilizam |
| **Calm & Trust** | Tom seguro, humano, clínico, tranquilizador; reduzir ansiedade do pai em cada ecrã |
| **Reachability** | Ações primárias na **zona do polegar** (terço inferior); navegação e CTAs bottom-anchored |
| **Inclusive** | Dynamic Type, contraste AA+, alvos ≥44pt (iOS)/48dp (Android), VoiceOver/TalkBack |

## Native feel — estratégia multiplataforma
- **iOS**: SF Pro, navegação com large titles, sheets, swipe-back, haptics, SF Symbols.
- **Android**: Roboto/Material 3, top app bar + bottom nav, ripple, dynamic color (Material You opcional), back gesture.
- **Flutter adaptativo**: componentes que assumem a aparência nativa por plataforma (`.adaptive`), mas com tokens de marca partilhados (cor, espaçamento, raio, tipografia de display).

## Outputs (mapeados ao pedido)

| # | Pedido | Documento |
|---|--------|-----------|
| 1 | Information Architecture | [01 · IA](01-information-architecture.md) |
| 2 | Navigation structure | [02 · Navegação](02-navigation.md) |
| 3 | User journeys | [03 · User Journeys](03-user-journeys.md) |
| 6 | Design System | [04 · Foundations](04-design-system-foundations.md) |
| 7 | Color system | [04 · Foundations §Cor](04-design-system-foundations.md#cor) |
| 8 | Typography system | [04 · Foundations §Tipografia](04-design-system-foundations.md#tipografia) |
| 9 | Component library | [05 · Componentes](05-component-library.md) |
| 10 | Responsive behavior | [06 · Responsivo](06-responsive-behavior.md) |
| 4+5 | Wireframes + Screen descriptions — **Pai** | [07 · Pai](07-wireframes-parent.md) |
| 4+5 | Wireframes + Screen descriptions — **Pediatra** | [08 · Pediatra](08-wireframes-pediatrician.md) |
| 4+5 | Wireframes + Screen descriptions — **Clínica** | [09 · Clínica](09-wireframes-clinic.md) |
| 4+5 | Wireframes + Screen descriptions — **Administrador** | [10 · Admin](10-wireframes-admin.md) |

## Convenções dos wireframes
- Moldura `┌─┐` representa um ecrã de telemóvel (mobile-first). Web/tablet em [doc 06](06-responsive-behavior.md).
- `[ Botão ]` = ação primária · `‹` = voltar · `⊙` = avatar · `⚠️` = segurança clínica · `🔒` = privacidade.
- **Zona do polegar** = ações primárias ancoradas em baixo.
- Cada ecrã traz **Screen description**: objetivo, elementos, estados, acessibilidade, ação primária.
