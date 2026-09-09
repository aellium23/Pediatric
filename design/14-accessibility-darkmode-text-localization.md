# 14 · Accessibility, Dark Mode, Large Text & Localization

## 10 · Accessibility (WCAG 2.2 AA — verificável)
- **Screen readers**: VoiceOver (iOS) + TalkBack (Android) — ordem de foco lógica, `label`/`hint`/`role`/`value`, agrupamento semântico, anúncios de mudança de estado (live regions: "pediatra respondeu", erros de pagamento).
- **Touch targets**: ≥ **44×44pt** (iOS) / **48×48dp** (Android); espaçamento ≥ 8.
- **Contraste**: texto ≥ 4.5:1, texto grande ≥ 3:1, UI/gráficos ≥ 3:1 — em **claro e escuro**.
- **Cor nunca isolada**: estado = cor + ícone + texto (ex.: SLA âmbar + relógio + "expira em 1h").
- **Foco visível** (web/teclado); navegação por teclado completa nos portais.
- **Reduce Motion**: desliga parallax/auto-advance; transições essenciais simplificadas.
- **Reduce Transparency / Increase Contrast**: respeitados (materiais translúcidos → sólidos).
- **Legendas/transcrição** na videochamada quando disponível; alternativa textual a todos os gráficos (crescimento/percentis com tabela).
- **Sem dependência de gesto único**: todo gesto tem equivalente tocável.
- **Tempo**: sem limites de tempo que penalizem (SLA é informativo; reautenticação avisa antes).
- **Erros**: claros, específicos, com sugestão de correção; anunciados a leitores de ecrã.
- **VoiceOver Rotor / headings**: ecrãs com headings corretos para navegação rápida.

### Checklist a11y por ecrã (gate)
- [ ] Todos os elementos interativos com label.
- [ ] Ordem de foco lógica.
- [ ] Contraste AA (claro+escuro).
- [ ] Alvos ≥44/48.
- [ ] Estado não-só-cor.
- [ ] Funciona a 200% de texto.
- [ ] Reduce-motion/transparency ok.

## 11 · Dark mode
- **Nativo** (segue o sistema) + override manual (claro/escuro/automático) em Definições.
- Paleta escura dedicada ([doc 04](04-design-system-foundations.md)): `bg/canvas #0C1413`, superfícies elevadas por luminância (não só sombra), `brand/primary` clareado para contraste.
- **Sem true-black puro** em superfícies de conteúdo clínico (conforto/legibilidade); OLED-friendly nos fundos.
- Imagens/ilustrações com variantes dark; gráficos recalculam cores para contraste.
- **Elevação por luz** no dark (superfícies mais claras = mais elevadas), à Material 3.
- Teste de contraste AA **em ambos** os temas como gate.

## 12 · Large text mode
- **Dynamic Type (iOS) / Font Scale (Android)** suportado até tamanhos de **acessibilidade (≥200%)**.
- Layouts **reflow**, não truncam conteúdo crítico; cards crescem; botões mantêm alvo e quebram texto.
- **Sem texto em imagem** (tudo é texto escalável).
- Ícones acompanham a escala onde fazem parte do significado.
- Testar SE @ 310% (maior risco de overflow) — conteúdo crítico permanece acessível via scroll.
- Espaçamento e line-height escalam proporcionalmente.

## 13 · Localization (i18n)
- **Idiomas de lançamento**: **PT-PT** (primário), **EN** (expatriados), **ES** (expansão).
- **Arquitetura**: strings externalizadas (ICU message format), plurais/género, **sem concatenação**; chaves por contexto.
- **RTL-ready** (preparação para futuro; layouts espelháveis) — não é mercado inicial mas a base suporta.
- **Formatos por locale**: datas, horas, **moeda (€)**, números, percentis, unidades (kg/cm), fusos horários (slots de vídeo no fuso do utilizador).
- **Conteúdo clínico/legal** traduzido por humanos qualificados (termos médicos, consentimentos, avisos de segurança — SNS 24 é PT-específico; ES terá equivalente local).
- **Expansão de texto**: alemão/finlandês podem crescer ~30% → layouts toleram (testado).
- **Localização de stores** (ASA/Play): metadados, screenshots por idioma.
- **Deteção** do idioma do sistema + override manual; persistência por conta.

## Interação entre modos (matriz de robustez)
| Combinação | Tem de funcionar |
|---|---|
| Dark + Large text (200%) | ✅ contraste e reflow |
| SE + Large text | ✅ scroll, sem corte de CTA |
| RTL + Dark (futuro) | ✅ espelhamento + contraste |
| VoiceOver + Reduce Motion | ✅ navegação completa |
| Localização ES + percentis | ✅ formatos/strings corretos |

## Governança
- **Tokens semânticos** (não cores hardcoded) → dark/contraste automáticos.
- **Pseudo-localização** no CI (deteta strings hardcoded e overflow).
- **Auditoria a11y** por release + testes com utilizadores assistivos antes do go-live.
