# E00 · Visão Estratégica Enterprise

> **Documento estratégico** para investidores, board executivo, equipa de produto, engenharia e parceiros institucionais.
> Complementa o [blueprint de produto](../README.md) com os requisitos enterprise de segurança, compliance, escala e investibilidade.

## Tese de investimento

**Pédia** não é uma app de telemedicina — é a **infraestrutura de confiança da saúde infantil na Europa**. Constrói-se, desde o primeiro dia, segundo padrões que permitem (a) gerir **dados de saúde de menores** ao mais alto nível de segurança e privacidade, (b) passar **due diligence** de VC, seguradoras e grupos hospitalares, e (c) **escalar internacionalmente** sem redesenho estrutural.

### Objetivo último (5 anos)
| Meta | Alvo |
|---|---|
| Famílias | **100.000** |
| ARR | **≥ 1.000.000 €** (e trajetória para 5–10M€) |
| Expansão | **Portugal → Espanha → Europa** |
| Padrão | Topo de mercado em **segurança, privacidade, compliance e UX** |

### Requisitos de escala (sem redesenho)
A arquitetura é dimensionada para suportar, sem reestruturação:
- **1.000.000 famílias** · **10.000 pediatras**
- **100.000.000 documentos clínicos**
- **50.000 consultas/dia** · **10.000 videochamadas simultâneas**

Ver [E10 · Escalabilidade](10-scalability.md) para o desenho que o garante.

## Os três pilares enterprise

1. **Trust & Safety by construction** — Security/Privacy by Design, Zero Trust, Defense in Depth, Secure by Default. Dados clínicos sempre encriptados (AES-256/TLS 1.3), acessos rastreáveis, consentimento parental e tutela. Ver [E02](02-security-architecture.md), [E04](04-data-protection.md).
2. **Compliance como moat** — RGPD, ERS, Ordem dos Médicos, AT (PT) e EHDS, NIS2, DORA, ePrivacy (UE). Roadmap de certificação OWASP ASVS → ISO 27001 → SOC 2 Type II. Ver [E07](07-compliance.md), [E09](09-devsecops-pentest-certs.md).
3. **Plataforma investível e escalável** — multi-tenant, multi-país, multi-moeda; moats defensáveis, efeitos de rede locais, retenção via arquivo clínico e relação com o pediatra. Ver [E11](11-investment-readiness.md).

## Mapa de documentos enterprise

| Doc | Tema |
|---|---|
| [E00](00-strategic-overview.md) | Visão estratégica (este documento) |
| [E01](01-app-stores.md) | App Store & Google Play: compliance e ciclo de vida |
| [E02](02-security-architecture.md) | Arquitetura de segurança & modelo de ameaças (Zero Trust, DiD) |
| [E03](03-iam-authentication.md) | IAM, autenticação, OAuth 2.1/OIDC, RBAC, MFA, Passkeys, Device Trust |
| [E04](04-data-protection.md) | Proteção de dados, encriptação, KMS, dados de menores |
| [E05](05-app-api-file-video-security.md) | Segurança de app móvel, API, ficheiros e vídeo |
| [E06](06-ai-security.md) | Segurança de IA (isolamento, prompt injection, DLP) |
| [E07](07-compliance.md) | RGPD + compliance de saúde (PT + UE: EHDS/NIS2/DORA/ePrivacy) |
| [E08](08-secops-bcdr.md) | SecOps, SIEM, SOC, resposta a incidentes, backup & DR |
| [E09](09-devsecops-pentest-certs.md) | DevSecOps, pentest, roadmap de certificações |
| [E10](10-scalability.md) | Arquitetura de escalabilidade |
| [E11](11-investment-readiness.md) | Prontidão para investimento, moats, valuation |

## Princípios não-negociáveis

- **Nenhum dado clínico é armazenado sem encriptação.**
- **Todos os acessos a dados de menores são rastreáveis e auditáveis.**
- **A IA nunca diagnostica autonomamente** nem usa dados clínicos para treino sem consentimento explícito.
- **MFA obrigatório** para pediatras, clínicas e administradores.
- **Secure by Default**: a configuração mais segura é a predefinida; deploys inseguros são bloqueados no CI.
- **Dados na UE**, com fornecedores sob DPA e residência de dados europeia.

> Nota: as posições regulatórias e fiscais (ERS, Ordem, AT, EHDS) são **orientações de arquitetura a confirmar** com assessoria jurídica/fiscal especializada — ver [doc 18 do blueprint](../docs/18-perguntas-criticas.md) e [E07](07-compliance.md).
