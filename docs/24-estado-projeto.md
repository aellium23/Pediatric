# 24 · Estado do projeto — o que falta implementar

Balanço do estado atual face ao plano (docs 01–23), roadmap (doc 15) e requisitos
enterprise. Legenda: ✅ feito · ◑ parcial / a degradar até config · ⏳ por fazer ·
🔑 depende de credenciais/serviços externos · ⚖️ legal/processo (não-código).

## 1. Roadmap (doc 15)
| Fase | Estado | Notas |
|---|---|---|
| **0 · Discovery** | ◑ | Tech (ADRs, CI/CD, auth, ambientes) ✅. Legal/fiscal/regulatório (DPIA, DPO, parecer ERS/Ordem, fiscalista) ⚖️ por fechar. |
| **1 · MVP Portugal** | ✅ | Auth, perfis, consentimentos, arquivo da criança, uploads, marketplace + verificação, consulta por mensagem + SLA + triagem, pagamentos (hold/capture/split), faturação por eventos, reembolsos, dashboard financeiro, notificações. Falta **pentest/hardening final** e **beta fechado** (processo). |
| **2 · Vídeo + Agenda** | ◑ | Agenda ✅, vídeo **media real** ✅ (sala LiveKit no web + token HS256 no backend; ativa com `LIVEKIT_*`), reembolsos/cancelamentos ✅, episódios ✅, notas/resumo pós-consulta ✅. Falta **lembretes push** 🔑, **Apple/Google Pay** 🔑(Stripe). |
| **3 · Escala** | ◑ | Subscrições ✅, conteúdos ✅, 2ª opinião/seguimento ✅, **clínicas B2B** ✅, i18n PT/EN/ES ✅, **partilha médico-médico** ✅. Falta **AI administrativa** (resumos), **percentis WHO** (temos IMC), **prep Espanha** ⚖️, **ISO 27001/SOC 2** ⚖️. |

## 2. Produto / funcional (backend = 21 módulos, 35 modelos)
Tudo o que não precisa de serviços externos está **implementado e em produção**:
auth, children, **health-records** (crescimento/IMC, vacinas, medicação, episódios),
consultations (mensagem + vídeo + SLA + triagem + episódios), pediatricians
(perfil/serviços/reviews/favoritos), scheduling, video (token), payments,
invoicing, subscriptions, clinics, content, notifications, files, privacy (RGPD),
admin (backoffice), observability, **referrals** (2ª opinião médico-médico),
**ai** (estruturação SOAP da nota por Claude).

**Feito recentemente:** ✅ **notas/resumo pós-consulta** (cifrado) · ✅ **gráfico de
crescimento** (altura/peso ao longo do tempo).

**Feito recentemente (cont.):** ✅ **2ª opinião médico-médico** (referrals
cifrados: pedido + aceitar/recusar + parecer; backend + UI do pediatra) ·
✅ **gestão documental de verificação** (pediatra submete cédula/diploma/seguro;
compliance aprova/recusa com nota; o binário usa o presign S3 quando ativo 🔑).

**Feito recentemente (cont.):** ✅ **resumo pós-consulta** com **dois caminhos** —
(1) rascunho SOAP determinístico a partir da triagem (`genDraft`, sem IA) e
(2) **estruturação por LLM** (Claude, botão "Estruturar com IA", atrás de
`ANTHROPIC_API_KEY`) · ✅ **ditado de voz** da nota (Web Speech API).

**Por fazer (produto):** **percentis WHO** — ◑ motor LMS (z-score, percentil,
classificação WHO, interpolação) **implementado e testado** (`common/growth/lms.ts`);
falta só integrar as **tabelas LMS oficiais** como dados versionados (ver
**doc 25**) · **AI administrativa** ◑ — **estruturação SOAP por LLM** (Claude) implementada
(endpoint `POST /consultations/:id/summary/structure` + botão "Estruturar com IA";
ativa com `ANTHROPIC_API_KEY`, degrada com 503 sem ela) · **AI scribe** de vídeo
(transcrição ambiente — planeado, ver **doc 26**; 🔑 STT + ⚖️ consentimento/DPA/DPIA).

## 3. Integrações reais 🔑 (código pronto, falta credenciais — ver doc 21)
- **Pagamentos**: Stripe live + **MB WAY** + Apple/Google Pay + Connect payouts.
- **Vídeo**: LiveKit (media real; JWT já é emitido).
- **Push**: FCM/APNs (tokens e eventos já existem).
- **Ficheiros**: AWS S3 + KMS (presign já implementado).
- **Faturação certificada PT**: adapter de parceiro **ATCUD/SAF-T**.
- **Identidade prod**: Apple/Google OIDC + **Passkeys** (config do domínio).

## 4. Segurança / IAM / Zero Trust
✅ RBAC + ABAC (guards), JWT (refresh rotativo), cifra de campo (AES-256-GCM),
audit log, helmet, rate limiting, CORS estrito (aberto só em demo), Terraform
(VPC/WAF/Secrets Manager/KMS).
⏳ **MFA real**, **pentest**, **SIEM/alertas**, rotação de segredos automatizada,
revisão de segurança formal (existe `/security-review`).

## 5. Compliance (RGPD / EHDS / NIS2 / DORA)
✅ Consentimentos versionados, **exportação de dados**, **apagamento/anonimização**,
audit trail, encriptação.
⚖️/⏳ **DPIA** (documento), mapeamento formal **EHDS/NIS2/DORA**, políticas de
**retenção**, **DPA** com fornecedores, pareceres **ERS/Ordem dos Médicos**.

## 6. Escala (alvo: 1M famílias · 50k consultas/dia · 10k vídeos/dia)
✅ Monólito modular + IaC (ECS Fargate/RDS).
⏳ **Testes de carga**, auto-scaling afinado, **read replicas**, **cache (Redis)**,
CDN, filas/eventos assíncronos a escala, particionamento — **não validado a escala**.

## 7. Observabilidade & CI/CD
✅ Logs estruturados + `/metrics` (Prometheus), GitHub Actions (lint, test, SAST/SCA,
secret-scan, build), Terraform.
⏳ **Tracing distribuído** (OpenTelemetry), dashboards/alertas, **Sentry** real,
pipeline de **deploy automatizado para produção** (ECS) + ambiente de **staging**.

## 8. Mobile nativo (Flutter) — doc 22
◑ Esqueleto (auth, children, home). ⏳ Paridade de ecrãs com a web + **TestFlight/Play**
🔑(Mac/conta Apple) + compliance de loja (privacy labels, classificação etária).

## 9. Qualidade / testes
◑ e2e (health) + unit em crescimento. ✅ unit: encryption, roles.guard, reviews,
scheduling, consultations (close/SLA/**resumo cifrado**), **subscriptions**
(catálogo por perfil + rejeição de plano incompatível), **health-records**
(controlo de acesso pai/pediatra + cálculo de IMC), **referrals** (2ª opinião:
autorização + ciclo de vida), **pediatricians-documents** (submissão/listagem),
**privacy/RGPD** (exportação com scope por perfil + anonimização), **clinics**
(autorização CLINIC_ADMIN/platform + revenue-share), **growth-lms** (motor de
percentis WHO), **content** (slug único + autorização autor/admin).
✅ **caminho do dinheiro e de auth** (lacuna nº1 da revisão E2E): **payments**
(intent família-só + demo + real; capture/split idempotente; reembolsos;
webhooks), **stripe** (503 sem chave; cálculo da comissão com arredondamento ao
cêntimo; reembolso total/parcial), **invoicing** (fatura do ato isenta de IVA +
comissão a 23%; idempotência; **valor segue o split capturado**), **token**
(rotação de refresh + deteção de reutilização → revoga sessões), **video**
(token só a participantes + JWT LiveKit HS256 verificável), **auth** (upsert
OIDC + *account-linking* por email + dev-login), **ai** (estruturação SOAP:
gating sem chave, chamada à Anthropic, surface honesto do erro upstream),
**notifications** (fan-out de mensagem com dedup + destinatários do ciclo de
vida). ⏳ admin (métricas/backoffice), testes de integração e E2E dos fluxos
principais.

---

## Prioridades sugeridas (próximos passos sem bloqueios externos)
1. **Testes** dos módulos novos (qualidade/confiança) — sem dependências.
2. **Notas/resumo pós-consulta** + **percentis WHO** — produto, sem creds.
3. **Observabilidade**: OpenTelemetry + Sentry (atrás de DSN) + staging.
4. **Mobile**: levar 2–3 ecrãs Flutter a paridade (precisa Mac p/ iOS).
5. **Com credenciais** (decisão do fundador): Stripe live + MB WAY, LiveKit, FCM/APNs.
6. **Legal/processo** ⚖️: DPIA, pareceres ERS/Ordem, DPAs — fora de código.
