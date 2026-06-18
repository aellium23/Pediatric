# Pédia — Implementation

Production-grade monorepo implementing the platform designed in [`README.md`](README.md), [`docs/`](docs/), [`enterprise/`](enterprise/), [`architecture/`](architecture/) and [`design/`](design/).

> **Built incrementally.** This file tracks what each increment delivers.

## Stack
| Layer | Tech |
|---|---|
| Mobile | Flutter (stable) · Riverpod · go_router · Dio |
| Backend | NestJS · TypeScript · Prisma |
| Database | PostgreSQL |
| Storage | AWS S3 (SSE-KMS) |
| Auth | OAuth 2.1 / OIDC · Passkeys (WebAuthn/FIDO2) · Apple · Google · JWT |
| Payments | Stripe Connect (MB WAY, card, Apple/Google Pay) |
| Infra | AWS via Terraform (VPC, RDS, S3, ECR, ECS Fargate, KMS) |
| CI/CD | GitHub Actions (lint, test, SAST/SCA/secret scan, build, deploy) |

## Monorepo layout
```
apps/
  backend/        NestJS API (modular monolith)
  mobile/         Flutter app (parent + pediatrician)
infra/
  terraform/      AWS IaC
.github/workflows/ CI/CD pipelines
scripts/          deploy & ops scripts
docker-compose.yml local dev (postgres + backend)
```

## Increments

### ✅ Increment 1 — MVP foundation (this commit)
- Monorepo + tooling (1)
- NestJS backend skeleton: config, Prisma, security (RBAC guards, JWT, audit, encryption), exception handling (2, 7)
- PostgreSQL schema (Prisma) for MVP entities (3)
- Auth module: OAuth2.1/JWT, Apple & Google OIDC verification, Passkey (WebAuthn) registration/login flow (4, 7)
- Domain modules: users/family/children, pediatricians, consultations, files (S3 signed URLs), payments (Stripe Connect) (2, 4)
- Health/readiness endpoints + OpenAPI (Swagger) (4)
- Docker + docker-compose + deploy scripts (12)
- Terraform skeleton for AWS (8)
- GitHub Actions CI (lint, test, security scans, build) (9)
- Unit + e2e test scaffolding with real examples (10, 11)
- Flutter app skeleton with Riverpod state management, routing, API client, auth scaffolding (5, 6)

### 🔜 Increment 2 — Consultation flow end-to-end
Messaging (WebSocket realtime), triage, SLA timers, payment hold→capture→split, invoicing adapter, consent enforcement.

### 🔜 Increment 3 — Pediatrician tooling + marketplace
Inbox, services/pricing, reviews, marketplace search; financial dashboard.

### 🔜 Increment 4 — Video, scheduling, notifications, hardening
WebRTC sessions, agenda, push, refunds/disputes, DevSecOps gates, pentest prep.

## Run locally
```bash
# 1. Boot Postgres + backend
docker compose up -d

# 2. Backend (without docker)
cd apps/backend
cp .env.example .env
npm install
npx prisma migrate dev
npm run start:dev      # http://localhost:3000  (OpenAPI at /docs)

# 3. Mobile
cd apps/mobile
flutter pub get
flutter run
```

> ⚠️ Secrets (Stripe, Apple, Google, KMS) are read from env/Secrets Manager — never committed. See `.env.example`.
