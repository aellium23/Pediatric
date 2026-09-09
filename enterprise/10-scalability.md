# E10 · Arquitetura de Escalabilidade

## Alvos de escala (sem redesenho estrutural)

| Dimensão | Alvo |
|---|---|
| Famílias | **1.000.000** |
| Pediatras | **10.000** |
| Documentos clínicos | **100.000.000** |
| Consultas/dia | **50.000** (~0,6/s média; picos ~5–10×) |
| Videochamadas simultâneas | **10.000** |

A arquitetura é desenhada para crescer **horizontalmente** e por **país/tenant**, sem reescrita.

## Princípios de escala
- **Stateless services** atrás de load balancers → escala horizontal e autoscaling.
- **Modular monólito → serviços extraíveis**: começar simples; extrair os domínios de alto volume (messaging, video signaling, files, notifications) quando justificar.
- **Async-first** para trabalho pesado: filas/eventos para faturação, notificações, payouts, scans de ficheiros, IA.
- **Multi-tenant** com isolamento lógico forte; **sharding por país e por tenant** quando necessário.
- **Cache em camadas** (CDN → edge → Redis) para reduzir carga na origem.
- **Backpressure & throttling** para degradação graciosa em picos.

## Camada de dados (o maior desafio de escala)

### PostgreSQL (dados transacionais)
- **Read replicas** para leitura; **connection pooling** (PgBouncer).
- **Particionamento** (por tempo e/ou por tenant) de tabelas grandes (mensagens, audit logs, consultas).
- **Sharding horizontal** por `country`/`tenant` quando uma instância deixar de chegar (a chave de sharding já existe no modelo de dados).
- **RLS** mantém-se em escala (segurança não é sacrificada).

### 100M+ documentos clínicos (object storage)
- Metadados em Postgres (indexados, particionados); **binários em object storage** (S3/GCS) — escala praticamente ilimitada e barata.
- Encriptação por objeto; **lifecycle policies** (tiering para armazenamento frio de ficheiros antigos).
- CDN com signed URLs para entrega escalável.

### Busca e séries temporais
- **OpenSearch/Elastic** para marketplace e pesquisa clínica (índices por tenant).
- Métricas de crescimento/percentis em store apropriado.

## Mensagens em tempo real (chat)
- **Gateway WebSocket** stateless + **Redis pub/sub** (ou NATS) para fan-out e presença.
- Persistência assíncrona; particionamento de mensagens por consulta/tempo.
- Escala horizontal de gateways; sticky sessions só onde necessário.

## Vídeo — 10.000 chamadas simultâneas
- **SFU (Selective Forwarding Unit)** escalável (LiveKit/Twilio/Vonage): cada chamada pediátrica é tipicamente **1:1 (médico–família)** → carga previsível.
- **Autoscaling de media servers** por região UE; balanceamento geográfico (TURN/STUN distribuídos).
- 10k chamadas 1:1 = ~20k streams — dimensionável com fleet de SFUs; **sem gravação por defeito** reduz custo/armazenamento.
- Sinalização stateless e escalável separada da media.

## Compute & infra
- **Kubernetes gerido** (EKS/GKE) ou serverless containers (Cloud Run/Fargate) com **HPA** (autoscaling por CPU/RPS/filas).
- **Multi-AZ**; **multi-região UE** para serviços críticos e resiliência (alinha com [DR](08-secops-bcdr.md)).
- **Event-driven**: SQS/PubSub/Kafka para desacoplar e absorver picos.
- **Edge/CDN** para assets, marketplace público e ficheiros.

## Multi-país / multi-moeda / multi-idioma (escala geográfica)
- `Country`, `TaxRule`, `CommissionRule`, `currency` já no modelo de dados.
- **Data residency por região**; estratégias fiscais/legais plugáveis por país.
- i18n PT/EN/ES desde o início; pipeline de localização.
- Onboarding de novo país = configuração + integrações locais (faturação/PSP), **não** reescrita.

## Performance & custo
- SLOs de latência (ex.: API p95 < 300 ms); orçamento de erro (error budgets).
- **FinOps**: tiering de storage, autoscaling, reserva/spot para batch, observabilidade de custo por tenant/país.
- Capacity planning baseado nos alvos acima; testes de carga regulares (k6/Locust) até picos previstos.

## Validação da escala
- **Load testing** contínuo contra os alvos (50k consultas/dia, picos, 10k vídeos).
- **Chaos engineering** (falhas de AZ/serviço) para validar resiliência.
- Observabilidade ponta-a-ponta (tracing) para identificar bottlenecks antes de saturar.

## Roadmap de escala (pragmático)
| Fase | Arquitetura | Escala suportada |
|---|---|---|
| MVP | Modular monólito + Postgres + object storage + 1 região UE | Milhares de famílias |
| Crescimento | Read replicas, particionamento, filas, CDN, multi-AZ | Centenas de milhares |
| Escala UE | Serviços extraídos, sharding por país, multi-região | Milhões / alvos enterprise |

> Princípio: **não sobre-engenharia no MVP**, mas **chaves de sharding, multi-tenant, async e data residency presentes desde o início** para que a passagem a escala seja evolutiva, sem redesenho.
