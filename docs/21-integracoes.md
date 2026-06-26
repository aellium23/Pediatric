# 21 · Integrações reais (ir a produção)

A plataforma corre **end-to-end em modo demonstração sem credenciais externas**
(pagamentos, vídeo, push e faturação degradam graciosamente). Para ativar cada
integração real, basta definir as variáveis de ambiente abaixo — o código deteta
a presença das credenciais e troca o adapter de demo pelo real, **sem alterações
de código**.

> Princípio: *secure-by-default + graceful degradation*. Sem credenciais, nada
> rebenta — corre em demo. Com credenciais, passa a real.

## Pagamentos — Stripe Connect (cartão, MB WAY, Apple/Google Pay)
| Variável | Descrição |
|---|---|
| `STRIPE_SECRET_KEY` | Chave secreta (test `sk_test_…` ou live `sk_live_…`). **Sem ela, pagamentos em demo (sem cobrança).** |
| `STRIPE_WEBHOOK_SECRET` | Segredo do endpoint de webhook (`whsec_…`) para reconciliação. |
| `STRIPE_PLATFORM_FEE_BPS` | Comissão da plataforma em basis points (default `2000` = 20%). |

- **MB WAY / Apple Pay / Google Pay**: ativam-se na conta Stripe (Payment
  Methods) — o `PaymentIntent` usa `automatic_payment_methods`, por isso ficam
  disponíveis sem mudar código. MB WAY requer conta Stripe PT com o método ativo.
- **Connect**: os pediatras fazem onboarding via `POST /pediatricians/me/connect`
  (cria conta Express + link). O `captureAndSplit` no fecho transfere a parte do
  pediatra e retém a comissão.
- O `StripeService` é *lazy*: sem chave fica DISABLED e os endpoints de pagamento
  respondem 503 claro em vez de falhar de forma críptica.

## Vídeo — LiveKit (teleconsulta, self-host UE)
| Variável | Descrição |
|---|---|
| `LIVEKIT_URL` | URL do servidor (ex.: `wss://video.suaempresa.eu`). |
| `LIVEKIT_API_KEY` | API key do projeto LiveKit. |
| `LIVEKIT_API_SECRET` | API secret. |

Com as três definidas, `GET /video/:consultationId/token` emite um **JWT LiveKit
real** (HS256 com *video grant*) aceite por qualquer SDK LiveKit, e a **app web
abre uma sala de vídeo real** (`apps/web/.../VideoRoom.tsx` com
`@livekit/components-react` — câmara, áudio, controlos). Sem elas, emite um token
de demonstração (o fluxo funciona, sem media real). Requer **DPA** com o
fornecedor UE antes de produção (ver doc 13/14).

## AI — assistente de documentação clínica (Anthropic Claude)
| Variável | Descrição |
|---|---|
| `ANTHROPIC_API_KEY` | Chave da API Anthropic (`sk-ant-…`). Sem ela, `POST /consultations/:id/summary/structure` ("Estruturar com IA") responde **503**. |
| `ANTHROPIC_MODEL` | Modelo a usar (default `claude-haiku-4-5`). |

Limpa/estrutura em **SOAP** a nota ditada ou escrita pelo pediatra, corrigindo
termos de transcrição **sem inventar factos**. Chamada **server-side** (a chave
nunca chega ao browser); o pediatra **revê antes de guardar**. Enviar texto
clínico a um LLM é processamento de dados de saúde → **DPA + residência UE +
consentimento** antes de produção (ver doc 26).

## Notificações push — FCM / APNs
| Variável | Descrição |
|---|---|
| `FCM_PROJECT_ID` | Projeto Firebase (Android/Web). |
| `FCM_SERVICE_ACCOUNT_JSON` | Credenciais de service account (JSON em base64). |
| `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_BUNDLE_ID`, `APNS_PRIVATE_KEY` | Credenciais APNs (iOS). |

O `NotificationPort` regista os tokens de dispositivo (`POST /notifications/devices`)
e dispara em eventos (`message.created`, `payment.captured`, `consultation.expired`).
Sem credenciais, regista a notificação in-app + log; com elas, entrega push real.

## Armazenamento de ficheiros clínicos — AWS S3 + KMS
| Variável | Descrição |
|---|---|
| `AWS_REGION` | Região (default `eu-west-1`). |
| `S3_BUCKET` | Bucket dos ficheiros clínicos (quarentena + SSE-KMS). |
| `S3_KMS_KEY_ID` | Chave KMS para cifra do lado do servidor. |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | Credenciais (ou IAM role no ECS). |

`POST /files/presign` devolve um URL assinado (5 min) para upload direto cifrado.

## Identidade — Apple / Google / Passkeys
| Variável | Descrição |
|---|---|
| `APPLE_CLIENT_ID`, `APPLE_ISSUER` | Sign in with Apple. |
| `GOOGLE_CLIENT_ID` | Google Sign-In. |
| `WEBAUTHN_RP_ID`, `WEBAUTHN_RP_NAME`, `WEBAUTHN_ORIGIN` | Passkeys (WebAuthn/FIDO2). |

`ENABLE_DEV_LOGIN=true` ativa o login de teste sem IdP — **nunca** em produção real.

## Faturação certificada Portugal — ATCUD / SAF-T
A faturação é emitida por um **parceiro certificado** (porta hexagonal
`BillingPort`, acionada no evento `payment.captured`): fatura do ato médico
(isenta de IVA) + fatura de comissão ao pediatra (IVA 23%), com `ATCUD` e
`partnerDocId`. Definir as credenciais do parceiro (ex.: `BILLING_PARTNER_API_KEY`,
`BILLING_PARTNER_BASE_URL`) ativa o adapter real; sem elas, regista a fatura em
modo simulado. Ver docs 12 e 13.

## Onde definir
- **Render** (backend): Dashboard → serviço `pedia-backend` → *Environment*.
- **AWS/ECS** (produção): via Secrets Manager + Terraform (`infra/terraform`).
- Variáveis marcadas `sync: false` no `render.yaml` são definidas manualmente.

## Checklist de go-live
- [ ] Stripe live + webhooks + MB WAY ativo + Connect testado
- [ ] LiveKit UE provisionado + DPA assinado
- [ ] Anthropic: `ANTHROPIC_API_KEY` + DPA + residência UE + consentimento (ou STT/LLM europeu)
- [ ] FCM/APNs com apps publicadas
- [ ] S3+KMS + IAM mínimo
- [ ] Apple/Google OIDC de produção; `ENABLE_DEV_LOGIN` **desligado**
- [ ] Parceiro de faturação certificado integrado (ATCUD/SAF-T)
- [ ] DPIA concluída + pareceres ERS/Ordem (ver docs 13/14)
