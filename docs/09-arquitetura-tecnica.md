# 09 · Arquitetura Técnica

## Princípios
- **Mobile-first**, app única multiplataforma; **API-first**; **segurança/privacidade by design**.
- **Modular monólito** no início (não micro-serviços prematuros) → extrair serviços quando justificar.
- **Multi-país / multi-moeda / multi-idioma** preparados desde o esquema de dados e i18n.
- **Dados na UE** (residência de dados RGPD); região UE em todos os fornecedores.

## Stack recomendada

### Mobile
- **Flutter** (recomendado) ou React Native.
  - *Flutter*: UI consistente, performance, bom para produto premium e único codebase iOS/Android (+ web possível).
  - *React Native*: maior pool de talento JS, ecossistema; bom se a equipa for JS-first.
- **Recomendação**: **Flutter**, pela consistência visual premium e desempenho; web responsiva separada (ver abaixo).

### Web (pais via browser + painéis)
- **Next.js (React/TypeScript)** para web pública/marketplace SEO + **portal do pediatra** + **backoffice admin**.

### Backend / API
- **Linguagem**: **TypeScript (NestJS)** ou **Python (FastAPI/Django)**. Recomendação: **NestJS** (tipagem forte, estrutura modular, mesmo ecossistema do web) — ou FastAPI se a equipa for Python/AI-forte.
- **API**: REST + OpenAPI; GraphQL opcional para o app. **WebSocket** para chat em tempo real.
- **Auth**: provider gerido (**Auth0/Clerk/AWS Cognito/Supabase Auth**) com social/Apple/Google + OTP + **MFA** (obrigatório para pediatras/admin).

### Dados
- **PostgreSQL** (relacional, dados estruturados) — gerido (RDS/Cloud SQL/Supabase).
- **Object storage** encriptado para ficheiros clínicos (**S3/GCS**) com **SSE-KMS** + URLs assinados curtos.
- **Redis** (cache, filas leves, rate limiting, presença de chat).
- **Motor de busca** (OpenSearch/Postgres FTS) para marketplace.
- **Fila/eventos** (SQS/PubSub/RabbitMQ) para faturação, notificações, payouts assíncronos.

### Serviços de domínio (módulos)
`identity` · `family/children` · `clinical-records` · `messaging` · `consultations` · `scheduling` (Fase 2) · `payments` · `invoicing` · `notifications` · `marketplace/reviews` · `admin/audit` · `ai-assist` (Fase 3).

### Vídeo (Fase 2)
- **healthcare-grade**: **Twilio Video**, **Vonage**, **Daily**, ou **LiveKit** (self-host/EU). Encriptado (DTLS-SRTP); sem gravação por defeito; região UE; DPA assinado.

### Pagamentos
- **Stripe Connect** (Express/Custom) e/ou **SIBS Marketplace** para MB WAY/Multibanco. Ver [doc 11](11-fluxos-pagamento.md).

### Faturação
- **Parceiro certificado AT** via API: **Vendus, InvoiceXpress, Moloni, Cegid/Sage** ou equivalente. Ver [doc 12](12-faturacao-portugal.md).

### Notificações
- **Push**: Firebase Cloud Messaging / APNs.
- **Email**: Postmark/SendGrid (EU).
- **SMS**: Twilio/SNS.
- **WhatsApp**: WhatsApp Business API (Meta) — só com consentimento e templates aprovados.

### Infra / DevOps
- **Cloud UE**: AWS (eu-west-1/Paris), GCP (europe-west) ou OVH/Scaleway para soberania.
- **Containers** (Docker) + **Kubernetes gerido** ou **ECS/Cloud Run** (começar simples: Cloud Run/Fargate).
- **IaC** (Terraform), **CI/CD** (GitHub Actions), ambientes dev/staging/prod.
- **Observability**: OpenTelemetry, Grafana/Prometheus, Sentry, logs centralizados (Loki/CloudWatch).
- **Secrets**: AWS Secrets Manager / Vault.

## Diagrama lógico (alto nível)

```
            ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
            │  App Flutter │     │  Web Next.js │     │  Backoffice  │
            │ (pais/médico)│     │ (marketplace)│     │   (admin)    │
            └──────┬───────┘     └──────┬───────┘     └──────┬───────┘
                   │  HTTPS/WSS         │                    │
                   └──────────────┬─────┴────────────────────┘
                                  ▼
                        ┌───────────────────┐
                        │   API Gateway     │  (auth, rate-limit, WAF)
                        └─────────┬─────────┘
                                  ▼
        ┌─────────────────────────────────────────────────────────┐
        │                  Backend modular (NestJS)                │
        │ identity│family│clinical│messaging│consultations│payments│
        │ invoicing│notifications│marketplace│admin/audit│ai-assist │
        └───┬─────────┬─────────┬──────────┬─────────┬───────┬──────┘
            ▼         ▼         ▼          ▼         ▼       ▼
       PostgreSQL  S3/KMS    Redis     Fila/Eventos  ...   Audit log
            │                                  │
            ▼                                  ▼
   (réplicas/backups)                ┌───────────────────────┐
                                     │ Integrações externas: │
                                     │ Stripe/SIBS · Faturação│
                                     │ Vídeo · FCM/APNs · SMS │
                                     │ WhatsApp · KYC/cédula  │
                                     └───────────────────────┘
```

## Tempo real (chat)
- WebSocket gateway com Redis pub/sub para presença e entrega; persistência em Postgres; anexos via storage com URLs assinados.

## Multi-país / i18n / moeda
- Tabelas `country`, `tax_rule`, `currency`; preços em menor unidade monetária; locale por utilizador; strings externalizadas (i18n) PT/EN/ES desde o início.
- Regras fiscais e de faturação **plugáveis por país** (strategy pattern) — ver doc 12.

## Decisões a registar (ADRs)
1. Flutter vs RN. 2. NestJS vs FastAPI. 3. Stripe Connect vs SIBS (ou ambos). 4. Cloud UE. 5. Provider de vídeo. 6. Parceiro de faturação. 7. Build vs buy para chat (custom vs Stream/Sendbird — atenção a residência de dados e compliance de saúde).
