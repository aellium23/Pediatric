# Estado — MVP + Fases A–F (além do MVP)

Resumo do que foi construído, para além do MVP, rumo à solução completa do
projeto (roadmap doc 15). Tudo testável na app web `/app` (telemóvel), com dados
reais do backend e *fallback* de demo quando não há credenciais externas.

## MVP (Fase 1 do roadmap) ✅
Auth (dev-login + Apple/Google/passkeys scaffolding), famílias/crianças (perfil
cifrado + consentimento), marketplace + perfis verificados + reviews, consulta
por mensagem (estados, SLA, auto-reembolso), pagamentos Stripe Connect
(hold/capture/split), faturação por eventos, vídeo (token + agenda), notificações.

## Fase A — Backoffice da plataforma ✅
Módulo `/api/admin`: métricas, verificação de pediatras (PENDING→ACTIVE/SUSPENDED),
gestão de utilizadores/papéis, registo de auditoria. UI para Admin, Compliance,
Suporte e Finanças.

## Fase B — Clínicas (B2B multi-tenant) ✅
`Clinic`, `ClinicMember`, `ClinicPediatrician` (partilha de receita). Módulo
`/api/clinics`: dashboard, equipa, associação de pediatras. Seed "Clínica Demo".
UI para Clínica · Admin/Staff.

## Fase C — Saúde rica + Episódios ✅
`GrowthMeasurement` (com IMC), `Vaccination`, `Medication`, `Episode`. Módulo
`/api/health-records` (texto sensível cifrado AES-256-GCM; acesso pai/pediatra).
UI: perfil de saúde por criança.

## Fase D — Subscrições ✅
`Subscription` (Plano Família / Pediatra Pro). Módulo `/api/subscriptions`
(catálogo por perfil, subscrever/cancelar). UI: tab Plano (pai) + secção no
perfil (pediatra).

## Fase E — Integrações reais (com fallback) ✅
Stripe *lazy/guarded* (demo sem chave; cartão+MB WAY+Apple/Google Pay+Connect com
chave). Vídeo: **JWT LiveKit real** quando configurado. `docs/21-integracoes.md`
com todas as variáveis + checklist de go-live.

## Fase F — Observabilidade + hardening + mobile ✅
Módulo `/api/observability`: logging estruturado por pedido (request-id + duração)
+ **métricas Prometheus** em `/metrics` (HTTP, consultas, pagamentos, mensagens).
Aviso de segurança se `ENABLE_DEV_LOGIN` em produção. Plano de conclusão do mobile
em `docs/22-mobile.md`.

## Fase UI/UX — redesign + Definições + dark mode ✅ (em curso)
Redesign do `apps/web` para um look limpo **estilo Instagram** (ver
`docs/23-design-system.md`): ícones de linha (sem emojis), listas com avatar +
chevron, barra inferior fixa só com ícones, cartões flat. Novo ecrã de
**Definições** (engrenagem no topo) com **Tema Claro/Escuro/Sistema**, **Tamanho
do texto** e **Idioma**. Lacunas de UX restantes listadas no doc 23 (chat em
bolhas, atalho de emergência, biometria/passkeys, pesquisa, estados vazios, etc.).

## O que falta para produção real (depende de credenciais/serviços externos)
- Stripe live + MB WAY + Connect (chaves) · LiveKit UE + DPA · FCM/APNs · S3/KMS
- Apple/Google OIDC de produção + desligar `ENABLE_DEV_LOGIN`
- Parceiro de faturação certificado (ATCUD/SAF-T)
- App nativa iOS/Android (Mac/TestFlight + Play) — ver doc 22
- DPIA + pareceres ERS/Ordem (docs 13/14)
