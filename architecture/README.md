# Pédia — Solution Architecture

> **Documento de arquitetura de solução completo**, produzido conjuntamente por:
> **CPO** (Chief Product Officer) · **CTO** (Chief Technology Officer) · **Principal Solution Architect** · **Principal Mobile Architect** · **Healthcare Compliance Officer** · **Cybersecurity Architect**
>
> Baseado na especificação em [`../README.md`](../README.md), [`../docs/`](../docs/) e [`../enterprise/`](../enterprise/).
> Notação: **C4 (Context/Container/Component/Code)**, diagramas Mermaid (renderizam no GitHub) e ASCII onde mais claro. **Sem código nesta fase.**

## Como a equipa abordou o problema

| Papel | Lente aplicada à arquitetura |
|---|---|
| **CPO** | Jornadas (pais/pediatras/admin), time-to-value, mobile-first, marketplace; garantir que a arquitetura serve o produto, não o contrário |
| **CTO** | Build vs buy, custo total, velocidade do MVP sem hipotecar a escala, governação de decisões (ADRs) |
| **Principal Solution Architect** | Decomposição em domínios (modular monolith → serviços), contratos entre sistemas, dados, integrações |
| **Principal Mobile Architect** | App Flutter, segurança no dispositivo, offline/sync, integração com stores, performance |
| **Healthcare Compliance Officer** | Dados de saúde de menores como categoria especial, RGPD/ERS/EHDS, consentimento, auditoria, residência UE |
| **Cybersecurity Architect** | Zero Trust, Defense in Depth, encriptação, IAM, modelo de ameaças, DevSecOps |

## Princípios de arquitetura (decisões fundadoras)

1. **Domain-driven modular monolith** no MVP, com fronteiras de domínio explícitas → extração para serviços nos domínios de alto volume quando o tráfego justificar. *Evita complexidade de microserviços prematura, preserva caminho de escala.*
2. **API-first** (OpenAPI) + **event-driven** para trabalho assíncrono (faturação, notificações, scans, IA).
3. **Security & Privacy by Design**, **Zero Trust**, **Secure by Default** em todas as camadas.
4. **Multi-tenant, multi-país, multi-moeda, multi-idioma** desde o esquema de dados.
5. **Residência de dados UE** e fornecedores sob DPA.
6. **Buy para compliance-pesado** (faturação certificada, KYC, vídeo), **build para o core diferenciador** (consultas, arquivo clínico, marketplace).

## Índice

| Doc | Tema | Entregáveis principais |
|---|---|---|
| [00 · Overview & C4 Context](00-overview.md) | Visão e contexto | **C4 Nível 1 (Context)** |
| [01 · System Architecture](01-system-architecture.md) | Arquitetura de sistema completa | **C4 Nível 2 (Container)** |
| [02 · Frontend Architecture](02-frontend-architecture.md) | Mobile + Web | Component diagrams |
| [03 · Backend Architecture](03-backend-architecture.md) | Serviços de domínio | **C4 Nível 3 (Component)** |
| [04 · Database Architecture](04-database-architecture.md) | Dados, particionamento, encriptação | ERD, modelo de armazenamento |
| [05 · Cloud Architecture](05-cloud-architecture.md) | Rede, regiões, serviços | Diagrama de infra |
| [06 · AI Architecture](06-ai-architecture.md) | IA administrativa segura | Component + data flow |
| [07 · Payments Architecture](07-payments-architecture.md) | Pagamentos + split + faturação | **Data flow diagrams** |
| [08 · Healthcare Compliance Arch.](08-compliance-architecture.md) | RGPD/EHDS/consentimento | Fluxos de consentimento/dados |
| [09 · Security Architecture](09-security-architecture.md) | Zero Trust, IAM, ameaças | **Security diagrams** |
| [10 · Deployment Architecture](10-deployment-architecture.md) | Ambientes, release, multi-região | Deployment diagram |
| [11 · DevSecOps Architecture](11-devsecops-architecture.md) | CI/CD seguro | Pipeline diagram |
| [12 · Scalability Architecture](12-scalability-architecture.md) | Escala aos alvos enterprise | Scaling diagrams |
| [13 · Technology Stack & Justifications](13-technology-stack.md) | Stack consolidada | **Justificação de cada escolha** |
| [14 · Data Flow Diagrams](14-data-flow-diagrams.md) | Fluxos ponta-a-ponta | **DFDs** (consulta, ficheiros, vídeo, RGPD) |

## Resumo da stack (detalhe e justificação no [doc 13](13-technology-stack.md))

| Camada | Escolha primária |
|---|---|
| Mobile | **Flutter** (iOS/Android) |
| Web | **Next.js / React / TypeScript** |
| Backend | **NestJS (TypeScript)**, modular monolith → serviços |
| API | REST + OpenAPI; WebSocket (chat); gRPC/mTLS interno |
| Dados | **PostgreSQL** + **Redis** + **OpenSearch** + **Object Storage (S3-compatible)** |
| Eventos | **Kafka / SNS+SQS / PubSub** |
| Identidade | **OIDC/OAuth 2.1** IdP gerido (Keycloak EU / Auth0 / Cognito) + Passkeys/FIDO2 |
| Pagamentos | **Stripe Connect** (+ MB WAY/Multibanco), abstração para **SIBS** |
| Faturação | Parceiro **certificado AT** (Vendus/InvoiceXpress/Moloni) |
| Vídeo | **LiveKit (EU self-host)** / Twilio / Vonage — WebRTC/SRTP |
| IA | LLM com **EU data boundary / self-host**, human-in-the-loop |
| Cloud | **AWS (eu-west / Paris)** ou GCP europe; IaC Terraform; K8s/Cloud Run |
| Observabilidade | OpenTelemetry + Grafana/Prometheus + Sentry + SIEM |
