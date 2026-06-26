# 24 · Estado do projeto — o que falta implementar

Balanço do estado atual face ao plano (docs 01–23), roadmap (doc 15) e requisitos
enterprise. Legenda: ✅ feito · ◑ parcial / a degradar até config · ⏳ por fazer ·
🔑 depende de credenciais/serviços externos · ⚖️ legal/processo (não-código).

## 1. Roadmap (doc 15)
| Fase | Estado | Notas |
|---|---|---|
| **0 · Discovery** | ◑ | Tech (ADRs, CI/CD, auth, ambientes) ✅. Legal/fiscal/regulatório (DPIA, DPO, parecer ERS/Ordem, fiscalista) ⚖️ por fechar. |
| **1 · MVP Portugal** | ✅ | Auth, perfis, consentimentos, arquivo da criança, uploads, marketplace + verificação, consulta por mensagem + SLA + triagem, pagamentos (hold/capture/split), faturação por eventos, reembolsos, dashboard financeiro, notificações. Falta **pentest/hardening final** e **beta fechado** (processo). |
| **2 · Vídeo + Agenda** | ◑ | Agenda ✅, vídeo (token + sessão) ✅, reembolsos/cancelamentos ✅, episódios ✅. Falta **media de vídeo real** 🔑(LiveKit), **lembretes push** 🔑, **Apple/Google Pay** 🔑(Stripe), **notas/resumo pós-consulta**. |
| **3 · Escala** | ◑ | Subscrições ✅, conteúdos ✅, 2ª opinião/seguimento ✅, **clínicas B2B** ✅, i18n PT/EN/ES ✅, **partilha médico-médico** ✅. Falta **AI administrativa** (resumos), **percentis WHO** (temos IMC), **prep Espanha** ⚖️, **ISO 27001/SOC 2** ⚖️. |

## 2. Produto / funcional (backend = 19 módulos, 33 modelos)
Tudo o que não precisa de serviços externos está **implementado e em produção**:
auth, children, **health-records** (crescimento/IMC, vacinas, medicação, episódios),
consultations (mensagem + vídeo + SLA + triagem + episódios), pediatricians
(perfil/serviços/reviews/favoritos), scheduling, video (token), payments,
invoicing, subscriptions, clinics, content, notifications, files, privacy (RGPD),
admin (backoffice), observability.

**Feito recentemente:** ✅ **notas/resumo pós-consulta** (cifrado) · ✅ **gráfico de
crescimento** (altura/peso ao longo do tempo).

**Feito recentemente (cont.):** ✅ **2ª opinião médico-médico** (referrals
cifrados: pedido + aceitar/recusar + parecer; backend + UI do pediatra).

**Por fazer (produto):** **percentis WHO** (requer o dataset oficial LMS — não
estimar de memória; carregar tabelas e aplicar o método LMS sobre o gráfico atual) ·
AI administrativa · gestão documental de verificação de cédula (upload de
documentos do pediatra).

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
(controlo de acesso pai/pediatra + cálculo de IMC). ⏳ **cobertura ampla**
dos restantes módulos novos (admin, clinics, content, privacy),
testes de integração e E2E dos fluxos principais.

---

## Prioridades sugeridas (próximos passos sem bloqueios externos)
1. **Testes** dos módulos novos (qualidade/confiança) — sem dependências.
2. **Notas/resumo pós-consulta** + **percentis WHO** — produto, sem creds.
3. **Observabilidade**: OpenTelemetry + Sentry (atrás de DSN) + staging.
4. **Mobile**: levar 2–3 ecrãs Flutter a paridade (precisa Mac p/ iOS).
5. **Com credenciais** (decisão do fundador): Stripe live + MB WAY, LiveKit, FCM/APNs.
6. **Legal/processo** ⚖️: DPIA, pareceres ERS/Ordem, DPAs — fora de código.
