# E08 · Security Operations, Backup & Disaster Recovery

## Security Operations (SecOps)

| Capacidade | Implementação |
|---|---|
| **SIEM** | Agregação centralizada de logs (app, infra, IAM, audit, WAF, EDR); correlação e deteção (ex.: Wazuh/Elastic, Microsoft Sentinel, Google Chronicle, Datadog Security) |
| **Monitoring** | Métricas, traces e logs (OpenTelemetry); dashboards de saúde e de segurança |
| **Alerting** | Alertas acionáveis com severidade, deduplicação e on-call (PagerDuty/Opsgenie) |
| **Threat Detection** | Regras + deteção comportamental/anomalias (logins anómalos, exfiltração, acessos clínicos fora de contexto, brute force) |
| **EDR/XDR** | Proteção de endpoints/servidores; deteção de ransomware/malware |
| **Vulnerability mgmt** | Scanning contínuo, priorização (CVSS + contexto), SLAs de remediação |
| **Threat intel** | Feeds, deteção de credenciais vazadas (HIBP), monitorização de marca/abuso |

### SOC — Processos
- Modelo **SOC** (interno e/ou MSSP) com cobertura adequada à fase (24/7 à medida que escala).
- Níveis: L1 triagem → L2 investigação → L3 resposta/forense.
- **Playbooks** por tipo de incidente; **runbooks** automatizados (SOAR) para resposta comum.
- Threat hunting periódico; revisão de deteções; redução de falsos positivos.

### Incident Response (IR)
Ciclo (NIST): **Preparação → Deteção & Análise → Contenção → Erradicação → Recuperação → Lições aprendidas.**
- **Classificação de severidade** (SEV1–SEV4) com tempos de resposta definidos.
- **Comunicação**: interna (war room), e externa quando exigido — **violação de dados pessoais: notificação à CNPD em 72h** + titulares; obrigações **NIS2** de reporte de incidentes (avaliar prazos aplicáveis).
- **Forense**: preservação de evidências, audit logs imutáveis, cadeia de custódia.
- **Break-glass** auditado para acessos de emergência.
- **Pós-mortem sem culpa** com ações corretivas rastreadas.
- Exercícios **tabletop** regulares (incl. cenário ransomware e insider threat).

## Backup & Recovery

### Política de backups
- **Diários**, **semanais** e **mensais** (esquema GFS — Grandfather-Father-Son), com retenção definida por categoria.
- **Encriptados (AES-256)**, **imutáveis** (object lock / WORM) e com **cópia offline/air-gapped** para resiliência a ransomware.
- **Cross-region** dentro da UE para resiliência geográfica.
- Backups de DB com **PITR (Point-In-Time Recovery)**.

### Objetivos de recuperação
| Métrica | Alvo |
|---|---|
| **RPO (Recovery Point Objective)** | **< 15 minutos** |
| **RTO (Recovery Time Objective)** | **< 1 hora** |

- **RPO < 15 min** garantido por: replicação contínua/streaming da DB + WAL archiving frequente + replicação de object storage.
- **RTO < 1 h** garantido por: infraestrutura como código (recriação automatizada), réplicas multi-AZ com failover, runbooks de recuperação ensaiados.

### Testes de recuperação
- **Restore drills regulares** (mensais/trimestrais) — restauro real validado, não apenas existência de backup.
- **GameDays / DR exercises**: simulação de perda de região/serviço; medição de RPO/RTO reais vs alvo.
- Verificação de integridade de backups (checksums) e de capacidade de desencriptação (gestão de chaves).

## Disaster Recovery & Continuidade
- **Plano de DR** documentado: cenários (falha de região, corrupção de dados, ransomware, falha de fornecedor crítico), dependências, ordem de recuperação.
- **BCP (Business Continuity Plan)**: continuidade de operações críticas (consultas em curso, pagamentos, suporte).
- **Arquitetura multi-AZ** (e multi-região UE para serviços críticos); sem ponto único de falha em componentes críticos.
- **Gestão de fornecedores críticos** (PSP, faturação, vídeo, cloud): planos de contingência e, onde viável, redundância/abstração (ex.: camada de pagamentos plugável).
- Alinhamento com **DORA/NIS2** na resiliência operacional e gestão de risco de terceiros ([E07](07-compliance.md)).

## Observabilidade de compliance
- Audit logs **append-only/imutáveis** com retenção longa (evidência para auditorias e pedidos RGPD).
- Métricas de segurança como KPIs de board: MTTD, MTTR, nº de incidentes, % backups testados, cobertura de patch.
