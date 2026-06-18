# 13 · Technology Stack & Justifications

*(Toda a equipa — decisões registadas como ADRs)*

Justificação de **cada escolha tecnológica major**. Formato: **Escolha · Alternativas consideradas · Porquê · Trade-off**.

## Mobile

### Flutter (iOS + Android)
- **Alternativas**: React Native, nativo (Swift/Kotlin), Kotlin Multiplatform.
- **Porquê**: codebase único com **UI premium consistente** e performance quase-nativa (Skia/Impeller); excelente para um produto de marca onde a coerência visual importa; bom suporte a segurança no dispositivo; web/desktop como bónus futuro.
- **Trade-off**: pool de talento menor que JS; algumas integrações nativas (atestação, biometria) exigem plugins/platform channels. **Aceitável** dado o ganho de consistência e velocidade.
- *Mobile Architect*: para healthcare, a consistência de UX e o controlo de rendering compensam; RN seria escolhido só se a equipa fosse fortemente JS-first.

## Web

### Next.js (React/TypeScript)
- **Alternativas**: SPA pura (Vite/React), Remix, Nuxt/Vue, Angular.
- **Porquê**: **SSR/ISR** dá SEO ao **marketplace** (descoberta orgânica de pediatras = canal de aquisição), mais CSR para áreas autenticadas; ecossistema React enorme; TypeScript partilhado com o backend.
- **Trade-off**: complexidade de SSR. **Justificado** pelo SEO do marketplace.

## Backend

### NestJS (TypeScript), modular monolith
- **Alternativas**: FastAPI/Django (Python), Spring Boot (Java), Go (microserviços).
- **Porquê**: **tipagem forte**, estrutura modular opinativa (encaixa em DDD/hexagonal), **mesma linguagem do web** (TS) → partilha de tipos/SDKs e contratação simplificada; modular monolith = velocidade de MVP com fronteiras para extrair serviços.
- **Trade-off**: Node é menos CPU-bound-friendly que Go/Java; mitiga-se isolando trabalho pesado em workers e (se preciso) o **AI Service em Python**. **Justificado** pela velocidade e coesão de stack.
- *CTO*: FastAPI seria a escolha se a equipa fosse Python/AI-first; a decisão é reversível por domínio (hexagonal).

### REST + OpenAPI · WebSocket · gRPC/mTLS interno
- **Porquê**: REST/OpenAPI = contratos claros + geração de SDK; WebSocket para chat/estados; gRPC/mTLS entre serviços internos (eficiência + Zero Trust).

## Dados

### PostgreSQL
- **Alternativas**: MySQL, SQL Server, MongoDB (documental).
- **Porquê**: **ACID forte** (crítico em pagamentos/faturação), **RLS nativo** (segurança multi-tenant por linha), particionamento, extensões (pgcrypto, pgvector, PostGIS), maturidade open-source, ofertas geridas UE, talento abundante.
- **Trade-off**: sharding manual a escala muito alta — mitigado por particionamento + chave de sharding desde o início.

### Redis
- **Porquê**: cache, sessões, presença de chat (pub/sub), rate limiting, filas leves (BullMQ). Padrão da indústria, simples, rápido.

### OpenSearch
- **Alternativas**: Elasticsearch, Postgres FTS, Algolia/Typesense.
- **Porquê**: pesquisa rica do marketplace e de histórico a escala; projeções CQRS. (Postgres FTS pode bastar no MVP — decisão faseada.)

### Object Storage (S3-compatível, SSE-KMS)
- **Porquê**: ficheiros clínicos a **escala ~ilimitada**, barato, durável, **object lock (imutabilidade)**, lifecycle/tiering, signed URLs. Binários nunca na DB.

### Event Bus (Kafka ou SNS+SQS)
- **Porquê**: desacoplamento, absorção de picos, event-driven (faturação/payout/notif/scan/IA). **SNS+SQS** mais simples no início; **Kafka/MSK** quando o throughput/retention justificar.

## Identidade

### OIDC/OAuth 2.1 IdP gerido (Keycloak EU / Auth0 / Cognito) + Passkeys/FIDO2
- **Alternativas**: construir auth próprio (**rejeitado** — risco), Clerk, Okta.
- **Porquê**: protocolos standard, MFA, social (Apple/Google), passkeys, device trust prontos; **não reinventar segurança crítica**. Keycloak self-host se soberania/custo o exigirem; Auth0/Cognito se velocidade.
- **Trade-off**: lock-in do IdP — mitigado por OIDC standard (portável).

## Pagamentos

### Stripe Connect (+ MB WAY/Multibanco), abstração para SIBS
- **Alternativas**: SIBS direto, Adyen, Mollie.
- **Porquê**: **split + KYC de pediatras + cobertura de métodos + melhor DX** → velocidade de MVP; **MB WAY** essencial em PT. Port `PaymentProvider` permite juntar **SIBS** para otimizar custo de MB WAY a volume sem reescrever.
- **Trade-off**: custos a alto volume — mitigado pela abstração multi-PSP.
- ⚠️ Confirmar cobertura atual de MB WAY no Stripe e condições SIBS ([doc 18](../docs/18-perguntas-criticas.md)).

## Faturação

### Parceiro certificado AT (Vendus / InvoiceXpress / Moloni / Cegid / Sage)
- **Alternativas**: certificar software próprio (**rejeitado** — moroso/caro).
- **Porquê**: **ATCUD/QR/SAF-T/e-Fatura** prontos e legalmente válidos; requisito-chave: **emissão em nome e por conta de terceiros / multi-emitente** (Modelo A — cada pediatra é emitente).
- **Trade-off**: dependência de parceiro — mitigado por adapter e por camada `TaxRule` plugável para multi-país.

## Vídeo

### LiveKit (self-host EU) / Twilio Video / Vonage — WebRTC/SRTP
- **Alternativas**: Daily, Agora, build próprio (**rejeitado**).
- **Porquê**: **healthcare-grade** (SRTP/DTLS/TLS), SFU escalável, **residência UE** + DPA, sem gravação por defeito. **LiveKit** dá controlo/soberania (self-host EU); Twilio/Vonage dão menor operação.
- **Trade-off**: LiveKit = mais operação; Twilio = menos controlo de dados. Decisão por ADR conforme prioridade soberania vs velocidade.

## IA

### LLM com EU data boundary / self-host (vLLM) + LLM Gateway (adapter)
- **Porquê**: dados clínicos exigem **zero-retention + opt-out de treino + residência UE**; adapter permite trocar de modelo; **human-in-the-loop** obrigatório. Self-host (vLLM + modelo aberto) para o mais sensível; provider enterprise UE para o resto.
- **Trade-off**: self-host = custo/operação de GPU; gerido = depender de garantias contratuais. Mix por sensibilidade.

## Cloud & Infra

### AWS (UE) — alternativa GCP europe; IaC Terraform; K8s (EKS) / Cloud Run; KEDA
- **Porquê**: breadth de serviços geridos (RDS, KMS/HSM, WAF/Shield, OpenSearch, MSK), maturidade de compliance UE, talento. **Terraform** = portabilidade/reprodutibilidade. **Cloud Run/Fargate** no MVP (menos ops) → **EKS** a escala. **KEDA** escala workers por fila.
- **Trade-off**: risco de lock-in cloud — mitigado por IaC + containers + serviços com equivalentes.

## Observabilidade & Segurança

### OpenTelemetry + Grafana/Prometheus + Sentry + SIEM (Wazuh/Elastic/Sentinel) + EDR
- **Porquê**: telemetria vendor-neutral (OTel), erros (Sentry), correlação de segurança (SIEM), deteção de endpoint (EDR). Suporta SOC/IR e os KPIs de segurança do board.

### DevSecOps: Semgrep/CodeQL · Snyk · Gitleaks · Trivy · Checkov · OWASP ZAP · sigstore/SLSA
- **Porquê**: cobertura SAST/SCA/secret/container/IaC/DAST + supply chain; **gates que bloqueiam deploys inseguros**; gera evidência para ASVS/ISO/SOC2.

## Tabela-resumo de ADRs
| ADR | Decisão | Estado |
|---|---|---|
| 001 | Modular monolith (NestJS) → serviços | Aceite |
| 002 | Flutter (mobile) | Aceite |
| 003 | Next.js (web/SEO) | Aceite |
| 004 | PostgreSQL + RLS | Aceite |
| 005 | Stripe Connect + abstração SIBS | Aceite (validar MB WAY) |
| 006 | Faturação via parceiro certificado (Modelo A) | Aceite (validar fiscal) |
| 007 | Vídeo WebRTC EU (LiveKit/Twilio) | A decidir (soberania vs ops) |
| 008 | IdP OIDC gerido + Passkeys | Aceite |
| 009 | Cloud AWS UE + Terraform + K8s | Aceite |
| 010 | IA isolada, human-in-loop, EU boundary | Aceite |
| 011 | Object storage para ficheiros (não DB) | Aceite |
| 012 | Event-driven (SNS+SQS → Kafka a escala) | Aceite |
