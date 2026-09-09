# CURRENT_PRODUCT_STATUS.md — HOC / Pédia

> Fotografia objetiva do produto, gerada por auditoria de código (read-only).
> Ramo: `claude/telepediatria-platform-design-pq1y1v` · Auditoria original:
> 2026-07-06 · **Atualizada a 2026-09-09** (cofre de documentos, leitura por IA,
> exportação FHIR, marcos de desenvolvimento, inclusão mensal no plano,
> instrumentação e migrations versionadas).
> Âmbito: `apps/web` (Next.js), `apps/backend` (NestJS + Prisma/PostgreSQL), `apps/mobile` (Flutter), `render.yaml`, `infra/`.
> Este documento descreve o estado atual; **não contém recomendações**.

---

## 1. Funcionalidades atuais por perfil

Navegação: `tabsFor(role)` define os separadores; toda a app vive em `/app` (componente `MultiProfileApp`, `apps/web/app/app/page.tsx`, ~12.100 linhas).

### Chrome partilhado (todas as sessões)
- Ecrã de entrada com seletor de perfis demo (dev-login): PARENT e PEDIATRICIAN em destaque + 6 perfis de equipa colapsados.
- Cabeçalho: logo, identidade do papel, botão de ajuda "?" (guia contextual por página, só tabs PARENT/PEDIATRICIAN), sino de notificações com badge de não-lidas, definições, "Trocar perfil".
- Botão SOS fixo (112 / SNS 24) em todas as sessões.
- Definições: tema claro/escuro/sistema, tamanho de texto, idioma PT/EN/ES, passkey (deteção), toggle de notificações (local), notas de conta.
- Onboarding (só PARENT, 1ª vez): consentimentos Termos/Privacidade/dados de saúde.
- NotifTab (via sino): avisos com deep-link para a consulta (`refId`).

### PARENT — tabs: home, consult, myconsults, children, myaccount
- **Início**: saudação; CTA "Falar com um pediatra"; próxima videoconsulta; resposta nova; chips das crianças; últimas 3 consultas; 2 artigos Saber+.
- **Consultar**: pesquisa por nome (sem acentos), filtro por especialidade (chips com descrições), preço máx., favoritos; cartão de pediatra (verificado, rating, região, línguas, janelas de mensagens + garantia SLA, fuso); perfil com avaliações; TriageDialog (red-flags, **aviso de que o assistente é IA** — AI Act art. 50.º, ack de urgência, expectativa de resposta + preço "Enviar pergunta · €X", ou "incluída no plano" quando há franquia por gastar); BookVideo (14 dias de slots, confirmação 2 toques, consentimento, dica de fuso).
- **Consultas**: lista agrupada por período; Thread (chat com bolhas, eventos de sistema, separadores de dia, fotos clínicas ≤3/mensagem com viewer fullscreen, videochamada LiveKit, cancelar com reembolso, "Nova consulta" em fechadas, avaliação ⭐ em CLOSED, remarcação em `pediatrician_unavailable`).
- **Crianças**: lista com avatares; adicionar (com consentimento); ChildHealth (foto, nº SNS cifrado, crescimento com curvas WHO + alertas, sinais vitais, vacinas PNV, alergias, medicação com dose sugerida e alerta alergia-fármaco, episódios ICPC-2/ICD-10); **Desenvolvimento** (marcos por idade, catálogo CDC, sem pontuação — ver `docs/compliance/03`); **Documentos** (cofre da criança: PDF/imagem até ~3 MB, quota por família, "Ler com IA" que propõe alergias/vacinas/medicação para o pai confirmar item a item); **Levar a ficha** (descarregar Bundle FHIR R4); Linha do tempo; Boletim imprimível.
- **Conta**: foto de perfil, método de pagamento (cartão/MB WAY/Apple/Google Pay), NIF (validado), região + código postal, subscrição (**consumo do mês à vista**: incluídas / usadas / restantes), faturas, privacidade (consentimentos, exportação RGPD **com a ficha de cada criança em FHIR**, apagar conta).

### PEDIATRICIAN — tabs: inbox, patients, referrals, agenda, profile, finance
- **Caixa**: "A responder" (graves primeiro → SLA) separada de "Respondidas · a aguardar" e "Recentes"; filtros Hoje/7d/30d/Tudo; "Videoconsultas de hoje"; realce de não-respondidas; chips meta (expectativa) + "Responder até" (SLA); Thread com resumo pós-consulta (+ estruturação SOAP por IA, ditado por voz), fecho, pedido de 2ª opinião.
- **Doentes**: famílias agrupadas (irmãos juntos); ficha da criança (vacinas em atraso por idade, alertas de crescimento, problemas/medicação ativos, curva de peso, histórico, **marcos de desenvolvimento**, **documentos do cofre** (lê, não apaga), Linha do tempo, Boletim — leitura).
- **2ª opinião**: recebidos/enviados/pedir; aceitar/recusar/parecer (conteúdo cifrado).
- **Agenda**: calendário Mês/Semana/Dia; blocos Vídeo (dourado) e Mensagens (azul) com filtro persistido; adição por toque (atalhos Manhã/Tarde/Noite) e por arrasto (desktop ≥900px); editar (todas as semanas / só este dia); remover/editar com consultas marcadas → diálogo de confirmação → reembolso + aviso de remarcação; férias (dias fechados) com a mesma proteção; marcações visíveis no calendário + ocupação no mês; copiar semana anterior; fuso de trabalho.
- **Perfil**: estado/rating; bio; fuso horário; serviços (tipo/preço/SLA); documentos de credenciação (só nome de ficheiro); "Publicar no Saber+" (submissão para revisão editorial, estados, resubmissão); subscrição; faturas; privacidade.
- **Ganhos**: filtros Hoje/Mês/Trimestre/Ano; KPI "Os teus ganhos" (líquido) + consultas liquidadas; extrato por consulta (bruto − comissão = líquido); nota de modo demo.

### PLATFORM_ADMIN — tabs: overview, verify, admin, users
- **Visão**: KPIs da plataforma; fila de revisão de conteúdos; secção Mercado (tabelas região/especialidade + gráfico de tendência 6/12 meses); distribuições por papel/estado.
- **Pediatras**: verificar/suspender; rever documentos.
- **Consultas**: todas as consultas; ver Thread; reembolsar.
- **Utilizadores**: listar; alterar papel.

### FINANCE — tabs: fin_treasury, fin_moves
- **Tesouraria**: KPIs (bruto, comissão, a pagar, reembolsos, ticket médio, taxa efetiva); gráfico de evolução 12 meses (faturação + comissão + reembolsos).
- **Movimentos**: filtros de período e estado; volume; ver Thread; reembolsar; paginação.

### COMPLIANCE — tabs: comp_overview, comp_creds, audit
- **Visão**: banner demo; KPIs de verificação; titulares de dados (art. 9.º); atividade de tratamento; acessos por perfil.
- **Credenciais**: filtro por estado; aprovar / recusar (nota obrigatória); nota "aprovar não ativa o perfil".
- **Auditoria**: registo imutável, pesquisa, filtro por ação, paginação.

### SUPPORT — tabs: sup_users, sup_peds (read-only)
- Pesquisa server-side de utilizadores + ficha 360 (dados, consultas, copiar email/ID); pediatras com documentos em leitura; notas de escalação. Sem ações mutáveis.

### CLINIC_ADMIN / CLINIC_STAFF — tab: clinic
- KPIs da clínica; receita da clínica (só se o backend enviar `finance`); fila de revisão de conteúdos (só admin); listas de pediatras/equipa/consultas; adicionar membro e associar pediatra (só admin). STAFF: vista sem ações de gestão.

### Papel desconhecido — tab: account
- `GenericTab`: dados do perfil + botão de teste de permissão (confirma RBAC).

---

## 2. Rotas / ecrãs existentes

**Rotas Next.js:** `/` (landing), `/app` (aplicação completa), `/demo` (fluxo mock), `/tour` (visita guiada estática, 4 personas), `/marketplace` (listagem pública SSR), `/manifest.webmanifest`.

**Ecrãs lógicos em `/app` (chaves de tab):** home, consult, myconsults, children, myaccount, inbox, patients, referrals, agenda, profile, finance, admin, overview, verify, users, audit, fin_treasury, fin_moves, comp_overview, comp_creds, sup_users, sup_peds, clinic, account, content, notif.

**Sub-views/diálogos:** Thread, ChildHealth, ChildTimelineView, BoletimView, ChildChart, PedDetail, TriageDialog, BookVideo, ReviewForm, ReferralRequest, PedDocsReview, CredDocsReview, SupportPedDocs, DocumentsSection, ContentAuthor, ContentReviewQueue, AccountProfileCards, SubscriptionSection, InvoicesSection, PrivacySection, MarketSection, HelpSheet, Emergency (SOS), SettingsScreen, Onboarding, VideoRoom (LiveKit), AvatarPicker, Autocomplete, viewer de imagem fullscreen, gráficos (GrowthChart, WhoGrowthChart, MarketTrendChart, FinanceEvolutionChart).

**Mobile (Flutter, `apps/mobile`):** auth, children, home, router; deep links e l10n anotados "Increment 2/3"; 1 teste.

---

## 3. APIs / endpoints existentes

Prefixo global `/api` (exceto `health*`, `metrics`). Guards globais: Throttler → JWT → Roles; interceptores de auditoria e observabilidade. Swagger em `/docs`.

### auth
| Método | Rota | Acesso |
|---|---|---|
| POST | /auth/dev-login | @Public (404 se desligado) |
| POST | /auth/apple · /auth/google | @Public |
| POST | /auth/refresh | @Public |
| POST | /auth/passkey/registration/{options,verify} | auth |
| POST | /auth/passkey/authentication/{options,verify} | @Public |

### users
GET /users/me · POST /users/me/photo · POST /users/me/photo/remove · POST /users/me/payment-method · POST /users/me/billing (NIF)

### children / families (PARENT)
POST/GET /children · GET /children/:id · POST /children/:id/photo · POST /children/:id/sns · GET /families/me · POST /families/me/region

### health-records (PARENT; leitura também PEDIATRICIAN com relação de consulta)
GET /health-records/:childId (overview + percentis WHO) · GET .../timeline · POST .../vitals · .../allergies (+ remove) · .../growth · .../vaccines · .../medications (+ active) · .../episodes (+ close) · GET .../development (catálogo + assinalados + por assinalar) · POST .../development (+ /:code/remove)

### documents — cofre da criança (PARENT escreve; PEDIATRICIAN com consulta lê)
GET /documents/:childId · GET /documents/:childId/quota · GET /documents/:childId/:id · POST /documents/:childId (valida assinatura dos bytes, quota por família) · POST /documents/:childId/:id/read (**PARENT**, 10/min — leitura por IA que *propõe* e não escreve) · POST /documents/:childId/:id/remove

### interop (PARENT)
GET /interop/fhir/:childId — ficha como Bundle FHIR R4, 10/min

### analytics
POST /analytics/track (eventos de cliente da lista fechada) · GET /analytics/funnel · GET /analytics/habit · GET /analytics/export (ADMIN)

### pediatricians
GET /pediatricians (@Public marketplace) · GET/POST/DELETE /pediatricians/:id/favorite + GET /favorites (PARENT) · GET/PATCH /pediatricians/me · GET /me/finance (from/to + extrato) · POST/PATCH/DELETE /me/services · POST /me/connect (Stripe onboarding) · GET/POST /me/documents · POST /reviews (PARENT) · GET /:id/reviews (@Public) · GET /:id (@Public, inclui timezone/janelas/preview de resposta)

### consultations
POST / (PARENT, consent-gated) · GET / (PARENT) · GET /inbox · /history · /patients (PED) · GET /child/:childId/history (PARENT,PED) · GET /all (ADMIN,FINANCE) · GET/POST /:id/messages (cifradas; anexos ≤3 fotos) · GET/POST /:id/summary (+ /structure via IA) · POST /:id/close (PED, captura+split) · POST /:id/cancel (PARENT) · POST /:id/refund (ADMIN,FINANCE). WebSocket `/realtime`: `consultation:join`, `message:new`.

### scheduling (PED salvo indicação)
POST /availability (kind VIDEO|MESSAGES, template/datado, repeatWeeks) · GET /availability/me · DELETE /availability/:id (?confirm) · PATCH /availability/:id (scope all|day, confirm) · GET /my-bookings?from&to · POST /unavailability (férias, confirm) · GET /pediatricians/:id/slots · /next-slots (PARENT) · POST /book (PARENT, transação Serializable + pré-autorização best-effort)

### video
GET /video/:consultationId/token (PARENT,PED — token LiveKit; marca startedAt)

### payments
POST /payments/intent (PARENT) · POST /payments/webhook (@Public, assinatura Stripe)

### notifications
GET /notifications · POST /notifications/:id/read · POST /notifications/devices

### content
GET /content (@Public) · GET /content/:slug (@Public) · GET /content/mine · POST /content · PATCH /content/:id (PED,ADMIN) · GET /content/review/pending · POST /content/:id/{approve,reject} (ADMIN, CLINIC_ADMIN)

### referrals (PED)
POST / · GET /incoming · /outgoing · /:id · POST /:id/{accept,decline,opinion}

### catalog (auth)
GET /catalog/{conditions,medications,allergens,vaccines,dose,drug-allergy}

### subscriptions (PARENT,PED)
GET /plans · GET /me · **GET /allowance** (incluídas/usadas/restantes, derivadas das consultas) · POST / · POST /cancel

### admin
GET /admin/metrics (ADMIN,COMPLIANCE,FINANCE) · GET /admin/finance/series · GET /admin/market (ADMIN,FINANCE) · GET /admin/pediatricians (+ verify/suspend) · GET /admin/users (?q) · GET /admin/users/:id · PATCH /admin/users/:id/role · GET /admin/audit · GET /admin/pediatricians/:id/documents · POST /admin/documents/:docId/review

### clinics
GET /clinics/me (CLINIC_ADMIN,STAFF) · POST /clinics · POST/DELETE /clinics/:id/staff(/:userId) · POST/DELETE /clinics/:id/pediatricians(/:pedId)

### privacy (auth)
GET /consents · POST /consents/:id/revoke · GET /export (RGPD — **inclui `records`: um Bundle FHIR por criança**) · POST /delete-account · GET /invoices

### infra
GET /health · /health/ready · /metrics (Prometheus in-memory) · POST /files presign (upload S3 SSE-KMS, quarentena)

---

## 4. Entidades / tabelas principais (Prisma)

**Enums:** Role (8), AuthProvider, ConsentSubject, PediatricianStatus, ServiceType (6), ConsultationStatus (8), PaymentStatus (6), AvailabilityKind (VIDEO|MESSAGES), SubscriptionPlan, SubscriptionStatus, ArticleStatus (4), ReferralStatus (4).

| Modelo | Notas |
|---|---|
| User | role, email/phone verificáveis, authProvider, nif (claro), locale, foto, método de pagamento |
| WebAuthnCredential · RefreshToken | passkeys; refresh como hash SHA-256, rotação com deteção de reuso |
| Consent | versionado, imutável, por sujeito (+childId) |
| Family · FamilyMember | região/código postal (analítica); membros com permissões |
| Child | **healthProfile e snsNumber cifrados**; foto |
| Pediatrician | licenseNumber, status, especialidades, região, **timezone IANA**, stripeAccountId |
| VerificationDocument | credenciação (pending/approved/rejected + nota) |
| PediatricianService | tipo, preço, slaHours (garantia), targetHours (expectativa) |
| Consultation | estado, preço, slaDueAt, expectedReplyAt, scheduledAt, **triage e summary cifrados** |
| Message | **body e attachments (fotos) cifrados**; aiGenerated |
| Payment · Split · Refund | psp stripe|demo; split plataforma/pediatra; refund com reason |
| Invoice · CommissionInvoice | ato médico (IVA isento) e comissão (IVA 23%); atcud/partnerDocId/pdfUrl |
| Review | verificada, 1 por consulta |
| Availability | kind, weekday, minutos wall-clock, date (datado), **closed (férias)** |
| VideoSession | provider livekit, roomId, startedAt/endedAt |
| Notification · DeviceToken | in-app com refId; tokens push (sem envio real) |
| AuditLog | append-only (actor, ação, entidade, ip, UA) |
| Clinic · ClinicMember · ClinicPediatrician | taxId, **ersRegistration**; revenueSharePct |
| GrowthMeasurement · Vital · Allergy · Vaccination · Medication · Episode | registos clínicos; campos identificantes cifrados, códigos (ICPC-2/ICD-10/ATC/PNV) em claro |
| Subscription · Favorite · Article · Referral | planos (**`includedMessages`: consultas por mensagem incluídas/mês**); favoritos; workflow editorial; 2ª opinião (**reason/opinion cifrados**) |
| FileAsset | storageKey, scanStatus (pending/clean/infected) |
| **ChildDocument** | cofre da família: **título e ficheiro cifrados**; mime decidido pela assinatura dos bytes; kind, sizeBytes, issuedAt |
| **DevelopmentMilestone** | marco assinalado pela família: `code` do catálogo em claro, `achievedAt`, **nota cifrada**; único por (criança, marco). **Não há linha para "não faz"** |
| **AnalyticsEvent** | funil e hábito; **sem coluna de texto livre** — só ids, nomes fixos e números |

---

## 5. Feature flags / módulos configuráveis

| Variável | Efeito | Sem valor |
|---|---|---|
| ENABLE_DEV_LOGIN | ativa /auth/dev-login **e o modo demo do CORS (reflete qualquer origem)** | desligado → 404 |
| STRIPE_SECRET_KEY (+WEBHOOK_SECRET, FEE_BPS) | pagamentos reais (intents, Connect, captura+transfer, refunds, webhook) | **modo demo**: Payment `psp:'demo'`, liquidação local |
| ANTHROPIC_API_KEY (+ANTHROPIC_MODEL) | assistente SOAP por IA (Claude) | 503 no endpoint de estruturação |
| LIVEKIT_API_KEY/SECRET/URL | token de sala real | token demo assinado (`dev-livekit-secret`); URL default `wss://video.pedia.local` |
| AWS_REGION/S3_BUCKET/S3_KMS_KEY_ID | presign de upload S3 | presign falha (bucket não provisionado em demo) |
| CORS_ORIGINS | allow-list em produção | vazio = nenhum (exceto modo demo) |
| JWT_*_SECRET / FIELD_ENCRYPTION_KEY | segredos (boot recusa defaults fracos em produção) | defaults dev |
| WEBAUTHN_RP_ID/ORIGIN, APPLE_*, GOOGLE_CLIENT_ID | IdPs/passkeys | fluxos não operacionais |
| Frontend: NEXT_PUBLIC_API_BASE | liga a app ao backend | landing/demo/marketplace em modo mock |

Flags de cliente (localStorage): pedia_token/refresh, pedia_profile, pedia_onboarded, pedia_help_seen, pedia_ag_kind, pedia_lang, pedia_theme, pedia_text, pedia_notif (local, sem push real).

---

## 6. Ativas vs escondidas vs incompletas

**Ativas** — tudo o descrito na secção 1.

**Escondidas / condicionais:**
- Tab `content` (Saber+ completo) não está em nenhum `tabsFor` — acessível só via cartões da Home e guia de ajuda.
- Receita da clínica só com `finance` do backend; fila de revisão desaparece em 403; Mercado/Séries degradam com "não foi possível carregar".
- Curvas WHO exigem sexo definido; drag-to-create só ≥900px; guia "?" só em tabs PARENT/PEDIATRICIAN.

**Incompletas / dependentes de credenciais:**
- Upload de documentos de credenciação: regista só o nome do ficheiro (armazenamento seguro pendente).
- Passkeys no frontend: deteção apenas; push: toggle local sem entrega; IA e vídeo real dependem de chaves; ver secção 9.

---

## 7. Fluxos end-to-end que funcionam hoje

| Fluxo | Estado factual |
|---|---|
| Registo/login | dev-login completo (demo). Apple/Google: código de verificação OIDC completo, inoperante sem client IDs. Passkeys: implementação real (challenge não vinculado a sessão server-side — nota no código). Refresh com rotação e deteção de reuso. |
| Criação de criança | Completo: consentimento HEALTH_DATA obrigatório, família lazy, perfil cifrado. |
| Consulta por mensagem | Completo em demo: start (consent + pediatra ACTIVE + SLA + expectativa) → triagem cifrada → mensagens cifradas → ANSWERED na 1ª resposta → fecho com captura+split → eventos. Cron por minuto expira SLA vencido com reembolso. |
| Marcação de vídeo | Completo: slots wall-clock por fuso do pediatra → book em transação Serializable (anti-corrida) → consentimentos → pré-autorização best-effort → sala LiveKit (token real com credenciais; demo sem servidor RTC). |
| Pagamento | Demo: Payment placeholder + liquidação local com split. Real (com chave): intent manual-capture, captura+transfer Connect, webhook de reconciliação. |
| Reembolso | Todos os caminhos: cancelamento do pai, SLA vencido, no-show de vídeo, indisponibilidade do pediatra, admin — idempotentes. |
| Faturação | Em `payment.captured`: fatura do ato (IVA isento, NIF do titular se existir) + fatura de comissão (IVA 23%), idempotente — valores/PDF do **adaptador stub** (ver §9). |
| Verificação de pediatra | Completo: submissão de docs → revisão compliance → ativação (ACTIVE + janelas de mensagens default seg–sex 9h–19h). |
| Arquivo clínico | Completo: registos → overview com percentis WHO → timeline → boletim com SNS decifrado; acesso do pediatra por relação de consulta (regra única em `ChildAccessService`). |
| Cofre de documentos | Completo: upload (tipo decidido pela assinatura dos bytes, quota por família 25 MB/100 docs) → cifrado em repouso → listagem sem os bytes → abertura por blob URL → apagar. Dois caminhos de descoberta (cartão na consulta fechada, pastilha no resumo da ficha). **Sem análise de malware** (§10). |
| Leitura de documento por IA | Com `ANTHROPIC_API_KEY`: o pai pede, o modelo transcreve alergias/vacinas/medicação, e o ecrã mostra tudo **por marcar**. Só o que ele marca é gravado, pelos endpoints normais da ficha. Sem chave devolve vazio e diz que não está disponível. Nada é escrito automaticamente. |
| Marcos de desenvolvimento | Completo: catálogo estático (CDC, 2 meses–5 anos, 4 domínios) → o pai assinala → entra na ficha, na timeline e na exportação FHIR. Marcos de bandas já ultrapassadas aparecem como "vale a pena falar com o pediatra" — **sem pontuação, sem nível de risco, sem condição nomeada**. |
| Exportação / portabilidade | Completo: `GET /interop/fhir/:childId` devolve Bundle FHIR R4 (Observation com LOINC/UCUM, AllergyIntolerance, Immunization, MedicationStatement, Condition, DocumentReference sem os bytes). A exportação RGPD leva um Bundle por criança. Limites declarados em `docs/compliance/02`. |
| Inclusão mensal no plano | Completo: o plano Família inclui 2 consultas por mensagem/mês; o uso é **derivado das consultas**, não de um contador paralelo; a franquia é da família e o período é o mês de calendário. A consulta coberta não cobra à família e regista o pagamento pelo valor integral com a plataforma como pagadora. |
| Instrumentação | Completo: eventos de funil e de hábito (lista fechada de nomes, sem texto livre), emitidos por eventos de domínio fora da cadeia clínica; ecrã de admin com funil, hábito semana a semana e exportação CSV. |
| Notificações | Evento → Notification in-app com deep-link + WebSocket em tempo real. Entrega externa (push/email/SMS): inexistente (stub). |
| Saber+ | Completo: seed (45 artigos) → leitura pública → autoria do pediatra → revisão editorial (aprovar/rejeitar com nota; edição de publicado volta a revisão). |

---

## 8. Funcionalidades demo-only / mockadas

- **dev-login** + seletor de 8 contas `@demo.pedia`.
- **PSP demo**: pagamentos/capturas/reembolsos locais sem Stripe.
- **Token de vídeo demo** (sem servidor LiveKit real; URL default inexistente).
- **Subscrições** ativam sem cobrança (sem Stripe).
- **Seed curado** (pediatras, famílias, crianças com histórico, consultas, 45 artigos) + **histórico de mercado sintético** `mkt.*` (gerador determinístico jan→mês atual para os painéis Mercado/Tesouraria).
- **/demo** (mock local sem backend) e **/marketplace** com fallback de demonstração.
- Banners explícitos de demonstração (Compliance, Definições, Clínica).

---

## 9. Não ligado a serviços reais

| Serviço | Estado no código |
|---|---|
| **Stripe live** | Integração completa (intents, Connect Express PT, captura+transfer, refunds, webhook assinado) — inativa sem `STRIPE_SECRET_KEY` (por preencher no render.yaml). |
| **Faturação certificada** | Porta hexagonal + adaptador **stub**: ATCUD fabricado, pdfUrl `https://billing.invalid/...`; integração real (Vendus/InvoiceXpress/Moloni, SAF-T) anotada "Increment 3". Sem parceiro contratado; PDFs não existem. |
| **S3** | Presign de **upload** real (SSE-KMS, quarentena, FileAsset pending). Sem presign de download; **sem scan de malware** ("Increment 2"); bucket não provisionado em demo (Terraform existe em `infra/` mas fora do caminho de deploy). |
| **Email/SMS/push** | Nenhum provider. Push = adaptador FCM/APNs que só faz `logger.debug`. Notificações apenas in-app. |
| **ERS** | Só o campo `Clinic.ersRegistration`; sem integração/validação. |
| **Apps nativas** | Web é PWA. Flutter (`apps/mobile`) com auth/children/home/router; deep links e l10n "Increment 2/3". |
| **IA (Anthropic)** | Integração real por HTTP; inativa sem `ANTHROPIC_API_KEY` (503). |
| **LiveKit** | Adaptador real de token; sem servidor/URL configurados. |

---

## 10. Riscos conhecidos, TODOs, placeholders, código morto

Sem `TODO`/`FIXME`/`HACK` literais no código de produção. Marcadores existentes:

- `files.module.ts:28` — scan de malware "(Increment 2)": **não implementado**; `scanStatus` fica `pending`. **O mesmo vale para o cofre de documentos**: mitigado por validação de assinatura dos bytes e visualizador do browser em sandbox, mas um PDF malicioso continua a ser um vetor (`SECURITY.md`).
- **Cofre em linha na base de dados** — o ficheiro fica como data URL cifrada na coluna, não em S3. Adequado ao piloto, deliberadamente não é a resposta de produção: o `FilesModule` já tem o caminho de URL assinado e é para lá que deve migrar antes de escalar.
- **Catálogo de marcos por rever clinicamente** — a redação PT e a banda etária de cada marco foram escritas por engenharia a partir da lista publicada dos CDC. Portão em `LAUNCH_READY.md` § E; `CATALOGUE.clinicallyReviewed` está a `null`.
- **Consulta coberta pela subscrição com dinheiro real** — exige uma transferência financiada pela plataforma (não há cobrança de cartão de onde a tirar). Em demo liquida localmente; comentado no `captureAndSplit`.
- **AI Act art. 50.º(2)** — marcação de conteúdo sintético, prazo 2 de dezembro de 2026, por fazer.
- `certified-partner.adapter.ts:12` — integração de faturação real "Increment 3" (stub).
- `invoicing.service.ts:10` — comentário "comissão em Increment 3" **desatualizado** (já implementada).
- `docs/26-ai-scribe.md` §§1–7 — plano da transcrição ambiente, **decidido não construir** (`PRODUCT_DECISIONS` §9c); fica como referência, não é trabalho por fazer.
- `passkey.service.ts:12-14` — challenge WebAuthn ecoado pelo cliente (nota: em produção deve ficar em sessão server-side).
- `main.ts` — com `ENABLE_DEV_LOGIN=true`, **CORS reflete qualquer origem** (modo demo); warn se em produção.
- `scheduling.service.ts:706` — pré-autorização de pagamento "best-effort" (marcação sobrevive a falha do PSP).
- Chips de marcação no calendário do pediatra posicionados pelo fuso do **dispositivo** (nota v1 no código).
- `stripe.service.ts` / `ai.module.ts` / `video.module.ts` — degradação documentada para modo demo/503.
- Mobile: deep links/l10n "Increment 2/3".
- `render.yaml` — `ENABLE_DEV_LOGIN=true` com `NODE_ENV=production` (ambiente demo declarado).
- Código morto: não foi identificado nenhum componente órfão no frontend; tab `content` está fora de `tabsFor` mas é alcançável (Home/guia).

---

## 11. Testes existentes e cobertura funcional

- **Backend unit**: 42 suites em `test/unit/` — **455 testes** (auth, token, roles.guard, encryption, filters, regions, wall-clock, expected-reply, who-growth, growth-lms, catalog, consultations (+patients), scheduling (+vacation, availability-edit), payments, stripe, invoicing, subscriptions, video, clinics, content, reviews, referrals, notifications, privacy, health-records (+vitals), admin (+market), children-sns, families-region, pediatricians-documents, users-billing).
- **Backend e2e**: 10 specs, **93 testes** contra Postgres real (`health`, `consultation-flow`, `children-flow`, `health-records-flow`, `patient-chart-flow`, `privacy-flow`, `documents-flow`, `subscription-allowance`, `interop-flow`, `development-flow`).
- **Web**: **67 testes** (vitest) — `assist.test.ts` (64: espinha de segurança dos sinais de alarme + encaminhamento por especialidade) e `translations.test.ts` (3: paridade EN/ES e cobertura de todos os literais que a app passa por `tr()`, **1157 chaves por língua**). Mais `tsc --noEmit`, `eslint --max-warnings 0` (com regras de acessibilidade) e `next build`.
- **Mobile**: 1 teste (auth controller).
- **Sem spec dedicado**: oidc.service, passkey.service, consent.service, files (presign), audit.interceptor, observability, adaptador push.

---

## 12. Estado de produção

| Área | Estado |
|---|---|
| **Frontend** | Vercel (root `apps/web`, `next build`). Cada push ao ramo constrói um **preview**; a **promoção a produção é manual** (Vercel → Promote to Production). Produção em `pediatric-taupe.vercel.app`; `NEXT_PUBLIC_API_BASE` aponta ao Render. |
| **Backend** | Render blueprint (`render.yaml`): plano **free**, branch fixado, boot = `scripts/db-migrate.js` (migrations versionadas) + seed idempotente + `node dist/main.js`; health check `/health`. Cold-start mitigado no cliente (retries) e keep-alive de 10 min quando a app está aberta. |
| **Base de dados** | PostgreSQL gerido Render (plano free). **Migrations versionadas** em `prisma/migrations`, aplicadas no arranque; uma base criada pelo antigo `db push` é feita *baseline* na primeira vez. Dados demo recriados/preservados por seed idempotente. |
| **Env vars** | Geradas no deploy: JWT_ACCESS/REFRESH_SECRET, FIELD_ENCRYPTION_KEY; DATABASE_URL da BD gerida. Por preencher (`sync:false`): CORS_ORIGINS, STRIPE_*, ANTHROPIC_*, LIVEKIT_*. Fixas: NODE_ENV=production, ENABLE_DEV_LOGIN=true (demo). |
| **Deployments** | Push ao ramo → **preview** na Vercel (web) + deploy automático no Render (API). Os dois lados não andam ao mesmo passo: a **API vai a produção sozinha**, o **frontend espera pela promoção manual**. O CI (Backend CI, Web CI) corre no mesmo push, com filtros de caminho, mas **não bloqueia nenhum dos dois**. |
| **Logs** | stdout apenas: log estruturado JSON por request (reqId, duração, status) + `/metrics` Prometheus com contadores **in-memory** (perdem-se em restart). Sem APM/Sentry/OTel. |
| **Segurança** | helmet; ValidationPipe global (whitelist+forbid); Throttler 100 req/min; JWT + RBAC globais (Zero-Trust, @Public explícito); auditoria de todas as mutações; AES-256-GCM em campos clínicos; refresh rotativo com deteção de reuso; segredos fora do repo (gitleaks); TLS terminado na plataforma. Em modo demo: CORS aberto e dev-login ativo. |
| **Backups** | **Nenhum backup de dados configurado** no repositório (sem pg_dump/snapshots automatizados). Backup de código: git (guia em `DEPLOY-DEMO.md`). A BD demo é reconstituível por seed. |

---

*Fim do documento. Gerado por auditoria de código em três varrimentos paralelos (frontend, backend/API/BD, fluxos/integrações/testes/produção).*
