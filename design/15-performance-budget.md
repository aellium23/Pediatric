# 15 · Performance Budget

Performance é parte da sensação premium (Revolut/Uber). Metas **mensuráveis** com orçamentos por ecrã e gates de release.

## 14 · Metas-chave
| Métrica | Alvo | Medição |
|---|---|---|
| **App launch (cold)** | **< 2,0 s** até primeiro ecrã interativo | Time-to-interactive no SE e mid-range Android |
| App launch (warm) | < 0,8 s | — |
| **Transições de ecrã** | **< 300 ms** | Tempo push/sheet até estável |
| Resposta ao toque | < 100 ms feedback (haptic/visual) | — |
| Scroll | 60 fps (120 onde suportado) | Sem jank > 16 ms |
| Abertura de chat | < 1 s para últimas mensagens | — |
| Resultado de marketplace | < 1 s (cache) / < 2 s (rede) | — |
| Tamanho da app | iOS < 80 MB / Android base < 30 MB (App Bundle) | Download |

## Orçamentos por ecrã crítico
| Ecrã | TTI alvo | Estratégia |
|---|---|---|
| Splash → Home (P-05) | < 2 s | Auth via passkey/biometria em paralelo; render skeleton; dados em stream |
| Marketplace (P-12) | < 1 s | Cache do último resultado; imagens lazy + placeholder; paginação |
| Chat (P-18) | < 1 s | Últimas N mensagens locais; resto stream; otimista no envio |
| Pagamento (P-17) | imediato; processamento < 3 s | Sheet instantânea; estado de processamento com haptic |
| Inbox pediatra (D-04) | < 1 s | Lista virtualizada; ordenação local; badge em tempo real |

## Como atingir < 2 s de arranque
- **Cold start enxuto**: inicialização mínima na main thread; deferir SDKs (analytics, vídeo) para pós-first-frame.
- **Skeleton-first**: render imediato do esqueleto da Home; dados chegam por stream (não bloquear).
- **Auth não-bloqueante**: biometria/passkey resolve em paralelo com pré-carregamento de Home.
- **Code/asset deferral**: deferred components (Flutter) para vídeo/funcionalidades pesadas; só carregam quando usadas.
- **Imagens**: formatos modernos (WebP/AVIF), tamanhos certos por densidade, CDN, cache.
- **Sem trabalho pesado no boot**: migrações/encriptação em background isolate.

## Como atingir < 300 ms de transição
- Transições nativas (push/sheet) com curvas do sistema; **sem** recomputar layout pesado durante a animação.
- **Pré-fetch** do próximo ecrã provável (ex.: ao abrir perfil do pediatra, pré-carrega serviços/preços).
- Listas **virtualizadas**; widgets `const`/memoizados; evitar rebuilds desnecessários.
- Render off-screen do destino antes da animação; imagens já em cache.

## Técnicas transversais
- **60/120 fps**: evitar jank — operações pesadas em **isolates**; paint simples durante scroll/animação.
- **Otimista + reconciliação**: UI responde já; rede confirma depois (mensagens, favoritos).
- **Caching em camadas**: memória → disco cifrado → rede; invalidação por evento.
- **Network**: HTTP/2/3, compressão, payloads mínimos (BFF agrega — [arquitetura](../architecture/02-frontend-architecture.md)), retries com backoff.
- **Cold-path vs hot-path**: hot-paths (consulta, pagamento, chat) recebem orçamento mais apertado e prioridade.

## Observabilidade de performance (produção)
- **RUM** (Real User Monitoring): launch time, frame rate, TTI por ecrã, por device class (SE vs Pro Max vs Android tiers).
- Percentis **p50/p95** por device tier; **alertas** em regressão.
- **Sentry** performance + traces; budget como **gate de CI** (build falha se exceder).
- Testes em **dispositivos reais low-end** (não só simulador) — SE e Android mid-range como baseline.

## Gates de release (performance)
- [ ] Cold start < 2 s no iPhone SE e Android mid-range (p95).
- [ ] Transições < 300 ms (p95) nos hot-paths.
- [ ] 0 jank > 16 ms em scroll de marketplace/chat (p95).
- [ ] Tamanho de app dentro do orçamento.
- [ ] RUM sem regressão vs release anterior.
