# 12 · Device Matrix & Adaptive Layout

Suporte obrigatório: **iPhone SE**, **iPhone 16 Pro Max**, **foldables Android**, **tablets**. Smartphone é o cidadão de primeira classe; tablet/foldable aproveitam o espaço sem virar "desktop".

## Matriz de dispositivos-alvo

| Dispositivo | Pontos lógicos (pt/dp) | Classe | Notas |
|---|---|---|---|
| **iPhone SE (2/3ª gen)** | 375 × 667 | `compact` | **Menor ecrã-alvo** — baseline de design; sem notch, Touch ID |
| iPhone 13/14/15 | 390 × 844 | `compact` | Notch/Dynamic Island |
| **iPhone 16 Pro Max** | ~440 × 956 | `compact-large` | Dynamic Island, ecrã grande — não usar como tablet |
| Android compacto (Pixel a) | 360 × 800 | `compact` | Densidades variadas |
| Android grande (Pixel Pro) | 412 × 915 | `compact-large` | Gesture nav |
| **Foldable fechado** (ex.: Z Fold cover) | ~360 × 880 (estreito) | `compact-narrow` | Ecrã externo muito estreito |
| **Foldable aberto** | ~673 × 841 | `medium` | Continuidade de estado ao desdobrar |
| **Tablet / iPad** | ≥ 768 × 1024 | `expanded`/`large` | Master-detail, multi-coluna |

## Regras de adaptação (resumo; base em [doc 06](06-responsive-behavior.md))

| Classe | Layout | Navegação |
|---|---|---|
| `compact` (SE → Pro Max) | **1 coluna**, CTAs full-width bottom | Tab bar inferior |
| `compact-narrow` (fold fechado) | 1 coluna ultra-segura, alvos garantidos, truncagem mínima | Tab bar |
| `medium` (fold aberto) | 2 colunas opcionais (lista+detalhe) | Tab bar ou rail |
| `expanded`/`large` (tablet) | **Master-detail**, grelhas | Navigation rail / sidebar |

## iPhone SE — baseline crítico
- **Tudo é desenhado primeiro a 375×667.** Se cabe e respira no SE, escala para cima.
- Sem depender de altura: conteúdo essencial + CTA visíveis **sem scroll** nos ecrãs de decisão (pagamento, triagem-resumo, consentimento crítico).
- Touch ID (não Face ID) → biometria adapta o copy ("Toca para autenticar").

## iPhone 16 Pro Max — não desperdiçar, não "desktopizar"
- Mais espaço = **mais respiração e conteúdo**, não nova densidade de desktop.
- Largura de leitura limitada (max ~560pt) para conforto; cards maiores, não mais colunas no perfil de pai.
- **Dynamic Island**: estado vivo de consulta/chamada (Live Activity — Fase 2) — "pediatra a responder", "chamada em curso".

## Foldables Android
- **Continuidade de estado**: dobrar/desdobrar **preserva** o ecrã e o scroll (state restoration); sem recomeçar fluxos.
- **Fechado (estreito)**: layout `compact-narrow` — alvos ≥48dp garantidos, sem cortar CTAs; testar a 360dp e abaixo.
- **Aberto**: aproveitar para **master-detail** (ex.: inbox+consulta do pediatra; lista+perfil no marketplace).
- **Tabletop/half-open** (flex mode): considerar split (conteúdo em cima, controlos em baixo) para vídeo.

## Tablets
- **Master-detail** (lista | detalhe) em vez de push.
- Formulários a 2 colunas com largura máxima; modais centrados (não bottom-sheet full).
- Pediatra/Clínica/Admin beneficiam mais (produtividade); app do pai mantém-se calma e centrada.

## Safe areas & hardware
- Respeitar **notch / Dynamic Island / home indicator / barras de gestos**; CTAs acima do home indicator.
- **Orientação**: portrait primeiro (uma mão); **videochamada** otimizada landscape; tablet ambas.
- **Hinge/dobra**: conteúdo crítico nunca sob a dobra do foldable.

## Estratégia técnica (Flutter)
- `LayoutBuilder` + `MediaQuery` → *size classes* (`compact/medium/expanded`).
- Componentes adaptativos por plataforma; **breakpoints por size class, não por device** (evita lista infinita de casos).
- **Golden tests** de layout nos 4 dispositivos obrigatórios + SE como gate.

## Matriz de verificação (QA gate)
| Ecrã-âncora | SE | 16 Pro Max | Fold fechado | Fold aberto | Tablet |
|---|---|---|---|---|---|
| Pagamento (P-17) | ✔ sem scroll | ✔ | ✔ alvos OK | ✔ | ✔ dialog |
| Triagem (P-15) | ✔ | ✔ | ✔ | ✔ 2-col | ✔ |
| Chat (P-18) | ✔ | ✔ Live Activity | ✔ | ✔ master-detail | ✔ |
| Inbox pediatra (D-04) | ✔ | ✔ | ✔ | ✔ master-detail | ✔ |
| Marketplace (P-12) | ✔ 1-col | ✔ | ✔ | ✔ 2-col | ✔ grelha |
