# 10 · Deployment Architecture

*(CTO + Principal Solution Architect)*

## Ambientes
| Ambiente | Propósito | Dados |
|---|---|---|
| **dev** | Desenvolvimento | Sintéticos (nunca reais) |
| **staging** | Pré-produção, DAST, testes de carga | Sintéticos/anonimizados |
| **prod** | Produção UE | Reais (encriptados) |
| **dr** | Disaster recovery (2ª região UE) | Réplica/backups |

Isolamento total entre ambientes (contas/projetos cloud separados; sem rota de dados reais para dev/staging).

## Deployment diagram

```mermaid
flowchart TB
    subgraph CICD["CI/CD (GitHub Actions)"]
        BUILD["Build + assina (SBOM/SLSA)"]
    end
    BUILD --> REG["Registry (imagens assinadas)"]
    REG --> STG["Staging (K8s/Cloud Run)"]
    STG -->|gate: DAST + carga + aprovação| PROD
    subgraph PROD["Produção — Região UE (multi-AZ)"]
        direction TB
        ING["Ingress + Edge/WAF"]
        subgraph K8S["Kubernetes / Cloud Run"]
            COREP["core-api (N réplicas, HPA)"]
            RTP["realtime-gw (HPA)"]
            WKP["workers (KEDA por fila)"]
            AIP["ai-service"]
        end
        DATAP[("RDS PG Multi-AZ + replicas\nElastiCache · OpenSearch · S3 · KMS")]
    end
    PROD -. replicação .-> DRR["DR — 2ª Região UE\n(PG replica, S3 replicado)"]
    ING --> COREP & RTP
    WKP --> DATAP
    COREP --> DATAP
```

## Estratégia de release
- **Trunk-based** + feature flags; **release train** quinzenal; **hotfix** acelerado para segurança.
- **Rolling / Blue-Green** para serviços backend; **Canary** para mudanças de risco (% de tráfego).
- **Mobile**: TestFlight / Play staged rollout (5%→100%); **forced minimum version** (kill-switch de versões inseguras) via remote config.
- **Migrations** de DB versionadas, *backwards-compatible* (expand/contract), executadas com gates.
- **Rollback** automatizado por health/SLO; artefactos imutáveis e assinados.

## Multi-região / DR (RPO<15m, RTO<1h)
```mermaid
flowchart LR
    subgraph P["Região Primária UE"]
        PGP[("PostgreSQL primário")]
        S3P[("Object Storage")]
    end
    subgraph S["Região Secundária UE (DR)"]
        PGS[("Replica streaming")]
        S3S[("Replicação")]
    end
    PGP -- streaming/WAL (<15m) --> PGS
    S3P -- replicação --> S3S
    PGP -. failover (RTO<1h, IaC) .-> PGS
```
- **RPO<15m**: replicação streaming + WAL archiving frequente; replicação de storage.
- **RTO<1h**: IaC (Terraform) recria stack; promoção de réplica; runbooks ensaiados (**GameDays**).
- Backups **imutáveis (object lock)**, GFS (diário/semanal/mensal), **restore drills** regulares.

## Configuração & segredos
- **IaC (Terraform)** para tudo; **policy as code (OPA)**; *drift detection*.
- **Secrets Manager/Vault** + **KMS**; rotação; **OIDC** do CI para a cloud (sem credenciais long-lived).
- Config por ambiente via parameter store; **sem segredos em imagens/repos**.

## Observabilidade em produção
- **OpenTelemetry** (traces/metrics/logs) → Grafana/Prometheus + **Sentry**; **SIEM** para segurança.
- **SLOs** + error budgets; alertas on-call (PagerDuty); dashboards de negócio/segurança/custo.

## Justificação
- **Kubernetes gerido (EKS)** para escala e portabilidade; **começar com Cloud Run/Fargate** para menor overhead operacional no MVP.
- **KEDA** escala workers por profundidade de fila (faturação/notificações/scan) — eficiente em custo.
- **Multi-AZ desde o início + DR multi-região**: resiliência sem complexidade de active-active prematura.
