# 17 · Detailed UX Specifications (per screen)

Especificação acionável por ecrã. Os wireframes estão em [07](07-wireframes-parent.md)–[10](10-wireframes-admin.md); aqui está o **contrato de UX** que um designer/engenheiro implementa.

## Template de especificação (aplicado a cada ecrã)
> **ID · Nome** — *Objetivo* · *Entrada (como se chega)* · *Layout & zonas* · *Componentes* · *Ação primária / secundárias* · *Toques* · *Estados* (default/loading/empty/error/offline/success) · *Gestos* · *Capacidades* (push/deeplink/biometria/offline) · *A11y* · *Dark/Large-text* · *Performance* · *Telemetria* · *Edge cases*.

---

# Especificações completas — Ecrãs-âncora

## P-02 · Sign in / Sign up
- **Objetivo**: autenticar/registar sem fricção (< 5 s).
- **Entrada**: Welcome → Começar; cold start sem sessão; deep link que exige auth.
- **Layout & zonas**: logo (fria); botões empilhados na zona quente; nota 🔒 e legais por baixo.
- **Componentes**: Apple/Google buttons (nativos), Telefone, Email, "Usar passkey", links legais.
- **Ação primária**: método social/passkey (1 toque). **Secundárias**: telefone/email.
- **Toques**: 1 (social/passkey) → autenticado.
- **Estados**: loading por botão; erro inline ("Não foi possível entrar — tenta outro método"); rede ausente → desativa social com aviso.
- **Gestos**: nenhum crítico; swipe-back.
- **Capacidades**: **Passkeys**; **biometria** se já registado; deferred deep link continua ao destino.
- **A11y**: foco inicial no 1º botão; labels; legais focáveis; anúncio de erro.
- **Dark/Large**: botões reflow; contraste AA.
- **Performance**: ecrã instantâneo; auth resolve < 2 s.
- **Telemetria**: método escolhido, sucesso/erro, tempo até auth.
- **Edge cases**: conta existente noutro método (sugere merge); passkey indisponível → OTP.

## P-05 · Home / Família
- **Objetivo**: estado da família num relance + retomar consulta em < 3 s.
- **Entrada**: pós-login (tab 🏠 default); push "pediatra respondeu" (deep link para chat, não aqui).
- **Layout & zonas**: saudação+avatar (fria); crianças (carrossel) + "Em curso" + "Sugestões" (neutra); tab bar (quente).
- **Componentes**: child cards (carrossel), consultation card, suggestion card, tab bar com badges.
- **Ação primária**: retomar consulta (card) **ou** ➕ Consultar. **Secundárias**: abrir criança, sugestão.
- **Toques**: retomar = 1; nova consulta = via ➕ (3 no total).
- **Estados**: **empty** (sem crianças → card "Adiciona a primeira criança"); loading = skeleton de cards; offline = dados em cache + banner; sem consultas = esconde secção.
- **Gestos**: pull-to-refresh; swipe no carrossel; long-press criança → ações rápidas.
- **Capacidades**: **offline read** (cache cifrada); push badges; **Quick Actions** levam a sub-ecrãs.
- **A11y**: cards como botões com label completo ("Leo, 8 meses, abrir arquivo"); ordem lógica.
- **Dark/Large**: cards crescem; carrossel mantém alvo.
- **Performance**: **skeleton < 1 s**, dados em stream; cold path total < 2 s.
- **Telemetria**: cards vistos/tocados, retoma de consulta, uso de sugestões.
- **Edge cases**: muitas crianças → carrossel scrollável; consulta expirada → card com estado + reembolso.

## P-12 · Marketplace
- **Objetivo**: encontrar e escolher pediatra de confiança (Airbnb-grade).
- **Entrada**: tab ➕; "Consultar sobre o Leo" (pré-seleciona criança); deep link de partilha.
- **Layout**: search (topo, colapsa no scroll), filter chips roláveis, lista de cards; banner ⚠️ fixo em baixo; CTA de filtros em sheet.
- **Componentes**: search bar, filter chips, pediatrician cards, bottom-sheet de filtros avançados, empty state.
- **Ação primária**: abrir perfil (Ver perfil). **Secundárias**: favoritar (swipe/ícone), filtrar.
- **Toques**: ver perfil = 1 (desde a tab).
- **Estados**: loading skeleton de cards; **empty** ("Sem resultados — ajusta filtros" + botão limpar); offline = último resultado read-only + banner; erro = retry.
- **Gestos**: scroll infinito/paginação; swipe-to-favorite; pull-to-refresh.
- **Capacidades**: deep link `/pediatrician/{slug}`; cache do último resultado offline.
- **A11y**: badge ✅ = "cédula verificada"; rating "4.9 em 5, 132 avaliações"; chips como toggles.
- **Dark/Large**: cards reflow; imagem com fallback de iniciais.
- **Performance**: < 1 s (cache)/< 2 s (rede); imagens lazy + placeholder; 60 fps no scroll.
- **Telemetria**: filtros usados, cards vistos, CTR para perfil, tempo até escolha.
- **Edge cases**: nenhum pediatra disponível na cidade/idioma → sugere alargar filtros / lista de espera.

## P-15 · Triagem
- **Objetivo**: estruturar a questão (admin) e detetar sinais de alarme — sem diagnosticar.
- **Entrada**: P-14 (após âmbito/preço).
- **Layout**: campos em coluna; checklist de red flags destacada; CTA "Rever e pagar" (quente).
- **Componentes**: textarea, stepper de febre (ºC), picker de duração, uploader, checklist red-flags.
- **Ação primária**: Rever e pagar. **Secundárias**: anexar.
- **Toques**: dentro do fluxo de 3 (➕→pediatra→consultar abre este como passo).
- **Estados**: validação suave (permite avançar com info mínima); **red-flag marcada → P-16 interstitial** (bloqueia até reconhecer); upload "a verificar" (scan); offline = **bloqueia** envio (precisa pagar) mas guarda rascunho.
- **Gestos**: scroll; sheets de picker.
- **Capacidades**: upload com scan; sem offline para submissão.
- **A11y**: stepper anuncia valor; checklist com labels claros; interstitial com foco preso.
- **Dark/Large**: campos reflow; no SE garante CTA visível com teclado fechado.
- **Performance**: instantâneo; upload assíncrono com progresso.
- **Telemetria**: red-flags marcadas, anexos, abandono.
- **Edge cases**: vídeo grande → comprime/avisa; sinal grave → encaminhamento prioritário.

## P-16 · Safety interstitial (red flag) — **crítico**
- **Objetivo**: encaminhar emergência para SNS 24/112 em < 3 s.
- **Entrada**: sinal de alarme em P-15 **ou** banner ⚠️ em qualquer ecrã.
- **Layout**: ícone ⚠️ grande, mensagem curta, **2 botões de chamada** (zona quente), link discreto "continuar online".
- **Ação primária**: **Ligar SNS 24**. **Secundária**: Ligar 112; continuar online (terciário, exige reconhecimento).
- **Toques**: 1 (ligar).
- **Estados**: estático; sem loading.
- **Capacidades**: **deep link tel:**; acessível offline (não precisa rede para discar).
- **A11y**: cor+ícone+texto; botões grandes; lido primeiro pelo screen reader.
- **Dark/Large**: alto contraste garantido; texto escala.
- **Edge cases**: sem rede móvel para chamada → mostra número grande copiável; tablet sem telefonia → mostra número + instrução.

## P-17 · Pagamento — **crítico (Revolut-grade)**
- **Objetivo**: pagar em segundos, com confiança e garantia.
- **Entrada**: após Rever (triagem) / marcação de vídeo.
- **Layout**: breakdown de valor (fria/neutra), seletor de método, nota 🔒 de garantia, CTA "Pagar X€" (quente, acima do home indicator).
- **Componentes**: line items (tabular), radio de método, Apple Pay/Google Pay/MB WAY nativos, botão pay.
- **Ação primária**: Pagar. 
- **Toques**: 1–2 (selecionar método + pagar; Apple Pay = 1 + Face ID).
- **Estados**: processing (spinner + "A processar…", botão bloqueado); **success** (haptic + check + transição automática para chat); **error** inline ("Pagamento não concluído" + retry, sem perder contexto); **MB WAY** = estado "Confirma na app do teu banco" com contador/timeout; offline = bloqueado com aviso.
- **Gestos**: dismiss da sheet (cancela com confirmação se em progresso = não).
- **Capacidades**: **biometria** (Apple/Google Pay); step-up; nunca offline.
- **A11y**: valores tabulares lidos; estado de processamento anunciado (live region); erro com foco.
- **Dark/Large**: breakdown reflow; no SE visível sem scroll.
- **Performance**: sheet instantânea; resultado < 3 s; haptic < 100 ms.
- **Telemetria**: método, sucesso/erro, tempo, timeout MB WAY.
- **Edge cases**: 3DS challenge (cartão) → web sheet segura e volta; fundos retidos (escrow) explicado; falha pós-cobrança → reconciliação + suporte.

## P-18 · Chat / Conversa — **crítico**
- **Objetivo**: comunicar com o pediatra; retomar via push em < 3 s.
- **Entrada**: Home card; **push deep link** `/consult/{id}`; histórico.
- **Layout**: header (criança, estado, pediatra ✅), mensagens (neutra), resumo/receita quando existe, composer + 📎 (quente), banner ⚠️.
- **Componentes**: message bubbles, attachment tiles, summary card, composer, safety banner.
- **Ação primária**: enviar mensagem. **Secundárias**: anexar, ver resumo.
- **Toques**: via push = 1 toque para o ecrã; enviar = 1.
- **Estados**: aberta (SLA chip "responde ~4h"), em triagem, **respondida** (push), encerrada (composer fecha após janela de reabertura, com CTA "Reabrir"); **offline** = histórico cifrado + envio enfileirado ("a enviar"); empty (nova) = prompt de contexto.
- **Gestos**: pull-to-load histórico; long-press mensagem (copiar/denunciar); swipe-back.
- **Capacidades**: **offline read + draft**; push/Live Activity de estado; deep link.
- **A11y**: bolha com autor+hora; anexos rotulados; conteúdo IA marcado; novas mensagens anunciadas.
- **Dark/Large**: bolhas reflow; anexos com thumb acessível.
- **Performance**: últimas N locais < 1 s; envio otimista; imagens progressivas.
- **Telemetria**: tempo de resposta percebido, anexos, reabertura.
- **Edge cases**: anexo infetado (scan) → bloqueado com aviso; SLA expirado → estado + reembolso; ligação cai a meio do envio → reenvio automático.

## D-04 · Inbox do pediatra — **crítico**
- **Objetivo**: ver o que responder, priorizado por SLA, em 1 toque.
- **Entrada**: tab 📥 (default do pediatra); **push** "nova consulta"/"SLA a expirar".
- **Layout**: segmented (A responder/Encerradas), ordenação, lista de cards (neutra), resumo de contadores (quente); tab bar.
- **Componentes**: segmented control, sort, consultation cards (estado/SLA/criança), counters, swipe actions.
- **Ação primária**: abrir consulta. **Secundárias**: ordenar, filtrar.
- **Toques**: abrir = 1.
- **Estados**: **empty** ("Tudo em dia 🎉"); loading skeleton; SLA a expirar destacado (vermelho+relógio+texto); offline = cache + banner.
- **Gestos**: swipe (marcar/arquivar); pull-to-refresh.
- **Capacidades**: push crítico (quebra quiet hours, configurável); deep link para consulta; **master-detail** em tablet/fold aberto.
- **A11y**: urgência não-só-cor; cards com label completo (criança, motivo, SLA restante).
- **Dark/Large**: cards reflow; contador legível.
- **Performance**: lista virtualizada < 1 s; badge em tempo real (WebSocket).
- **Telemetria**: tempo até abrir, SLA cumprido, ordenação usada.
- **Edge cases**: muitas consultas → virtualização + agrupamento por urgência; consulta reatribuída (clínica) → estado.

---

# Especificações compactas — restantes ecrãs

Mesmo template, forma condensada (objetivo · ação primária · toques · estados-chave · capacidades/a11y notáveis).

## Pai
| ID | Objetivo | Ação primária | Toques | Notas |
|---|---|---|---|---|
| P-01 Welcome | Comunicar valor | Começar | 1 | carrossel, reduce-motion |
| P-03 OTP | Verificar contacto | Confirmar (auto) | 0–1 | autofill SMS, reenvio |
| P-04 Consentimentos | Consentir granular | Continuar | 1 | versionado; CTA gated |
| P-06 Add child | Criar arquivo | Criar arquivo | 2 passos | autosave; consent saúde |
| P-07 Perfil criança | Hub da criança | Consultar sobre X | 1 | offline read |
| P-08 Vacinas | Ver/registar PNV | + registar | 1 | timeline; estados |
| P-09 Crescimento | Ver percentis | — | 0 | gráfico + tabela a11y |
| P-10 Ficheiros | Gerir docs | + carregar | 1 | scan; signed URL |
| P-11 Episódios | Ver caso clínico | abrir episódio | 1 | agrupa msg+files |
| P-13 Perfil pediatra | Avaliar e escolher | Consultar | 1 | favoritar; indisponível→próx. slot |
| P-14 Iniciar consulta | Ver âmbito/preço | Continuar | 1 | transparência total |
| P-19 Resumo & receita | Obter resumo/fatura | Avaliar | 1 | share sheet; download |
| P-20 Marcar vídeo | Escolher slot | Confirmar e pagar | 2 | chips de slots; consent |
| P-21 Sala de espera | Verificar A/V | (auto-admite) | 0 | teste câmara/micro |
| P-22 Em chamada | Teleconsulta | terminar | 1 | landscape; sem gravação |
| P-23 Pós-consulta | Fechar ciclo | Ver resumo | 1 | resumo + avaliação |
| P-24 Conta | Hub definições | (navegar) | 1 | — |
| P-25 Faturas | Obter faturas | download/share | 1 | offline se já obtida |
| P-26 Subscrição | Gerir plano | Subscrever/Gerir | 1–2 | nativo store rules |
| P-27 Privacidade/RGPD | Exercer direitos | Aceder/Exportar/Eliminar | 1 | **step-up biométrico**; confirmação destrutiva |

## Pediatra
| ID | Objetivo | Ação primária | Toques | Notas |
|---|---|---|---|---|
| D-01 Registo | Aderir | Começar registo | 1 | expectativas KYC |
| D-02 KYC | Verificar credenciais | Submeter passo | stepper | câmara p/ docs; MFA |
| D-03 Em validação | Aguardar/preparar | Definir serviços | 1 | não-bloqueante |
| D-05 Detalhe consulta | Decidir e responder | Encerrar com resumo | 1 | 1-col; abas; IA inline |
| D-06 Histórico criança | Contexto clínico | abrir ficheiro | 1 | audit visível |
| D-07 Encerrar | Resumo validado | Encerrar e enviar | 1 | dispara split+fatura |
| D-08 Serviços/preços | Configurar oferta | Guardar | 1 | toggles + sheet |
| D-09 Agenda | Definir disponibilidade | + adicionar | 1 | lista→grelha em tablet |
| D-10 Vídeo (pro) | Teleconsulta + notas | terminar | 1 | notas em sheet/PiP |
| D-11 Finanças | Ver receita/payouts | ver faturas | 1 | cards Revolut-like |
| D-12 Perfil público | Editar perfil | Guardar | 1 | pré-visualização |
| D-13 Avaliações | Gerir reputação | Responder | 1 | verificadas |
| D-14 Conta/Segurança | Gerir segurança | gerir MFA/passkeys | 1 | MFA obrigatório |

## Clínica (web-first + app companion)
| ID | Objetivo | Primária | Plataforma | Notas |
|---|---|---|---|---|
| C-01 Onboarding | Criar tenant | Continuar | Web | stepper |
| C-02 Dashboard | KPIs | Ver operação | Web + app companion (alertas) | cards |
| C-03 Pediatras | Gerir equipa | Convidar | Web (+app aprovar convite) | estados |
| C-04 Staff/Papéis | RBAC | Adicionar/editar | Web | least privilege |
| C-05 Operação | Consultas/agenda | abrir/reatribuir | Web + app (SLA alerts) | cards em mobile |
| C-06 Finanças | Faturação central | exportar SAF-T | Web | tabela→detalhe |
| C-07 Relatórios | Desempenho | exportar | Web | gráfico+tabela |
| C-08 Definições | Configurar | editar | Web | white-label tokens |

## Admin (backoffice web + app companion p/ aprovações)
| ID | Objetivo | Primária | Plataforma | Notas |
|---|---|---|---|---|
| A-01 Visão geral | Cockpit KPIs | ir à fila | Web | alertas |
| A-02 Utilizadores | Gerir | ver/gerir | Web | clínico mascarado |
| A-03 Validação | Aprovar pediatras | Aprovar | Web **+ app** (push+aprovar) | docs viewer |
| A-04 Pagamentos | Gerir finanças | reembolsar | Web (Finance) | tabela densa |
| A-05 Disputa | Arbitrar | Decidir | Web **+ app** (alerta) | evidência |
| A-06 Config comissões | Regras | Nova regra | Web | por país/tipo/plano |
| A-07 Relatórios | Métricas | exportar | Web | funil/coortes |
| A-08 Moderação/Audit | Moderar/auditar | moderar | Web | audit imutável |
| A-09 Compliance RGPD | DSR/consent | tratar | Web (Compliance) | CNPD 72h |
| A-10 Suporte | Tickets/incidentes | responder | Web **+ app** (SEV alerts) | SLA suporte |

---

## Estados globais (aplicáveis a todos os ecrãs)
- **Loading**: skeleton (nunca ecrã branco) · **Empty**: ilustração+1 CTA · **Error**: inline específico + retry · **Offline**: banner + ações enfileiradas · **Success**: haptic + confirmação curta · **Permission denied**: explica porquê + como ativar.

## Gates de aceitação por ecrã (resumo)
- [ ] Ação primária ≤ 3 toques e na zona quente.
- [ ] 6 estados definidos (loading/empty/error/offline/success/denied onde aplicável).
- [ ] A11y (labels, foco, contraste AA, alvo ≥44/48, 200% texto).
- [ ] Dark mode + large text validados.
- [ ] Deep link/push onde aplicável.
- [ ] Orçamento de performance cumprido (launch<2s / transição<300ms).
- [ ] Funciona no iPhone SE sem corte de CTA.
