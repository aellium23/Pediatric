# E02 · Arquitetura de Segurança & Modelo de Ameaças

## Princípios fundadores

| Princípio | Como se materializa na Pédia |
|---|---|
| **Security by Design** | Threat modeling em cada feature; controlos de segurança são requisito, não add-on |
| **Privacy by Design & by Default** | Minimização de dados; predefinições mais privadas; consentimento granular |
| **Zero Trust** | "Never trust, always verify": identidade forte + device trust + autorização contextual em cada pedido; sem rede "de confiança" |
| **Defense in Depth** | Camadas independentes (edge → app → dados → infra); falha de uma não compromete o sistema |
| **Secure by Default** | Configuração segura é a predefinida; tudo negado salvo explicitamente permitido; deploys inseguros bloqueados |

## Modelo de ameaças (assumimos que seremos alvo)

| Ameaça | Vetor | Controlos principais |
|---|---|---|
| **Ataques automatizados / bots** | Scanners, fuzzing | WAF, rate limiting, bot protection, Play Integrity/App Attest |
| **Ataques direcionados (APT)** | Exploração de cadeia | DiD, segmentação, least privilege, deteção comportamental, pentest |
| **Fraude** | Pagamentos, contas falsas | KYC pediatras, device fingerprint, regras antifraude do PSP, 3DS/SCA |
| **Roubo de credenciais / phishing** | Engenharia social | Passkeys/FIDO2 (phishing-resistant), MFA, alertas de novo dispositivo |
| **Credential stuffing** | Listas de passwords vazadas | Passkeys, MFA, rate limit por IP/conta, deteção de breach (HIBP), CAPTCHA adaptativo |
| **Session hijacking** | Roubo de token | Tokens curtos + rotação, binding ao dispositivo, certificate pinning, reauth para ações sensíveis |
| **Ransomware** | Malware em infra | Backups imutáveis offline, segmentação, EDR, least privilege, MFA em consolas |
| **Malware (ficheiros)** | Uploads clínicos | Malware/virus scan + content validation antes de armazenar (ver [E05](05-app-api-file-video-security.md)) |
| **Scraping** | Marketplace público | Bot protection, rate limit, ofuscação de endpoints, dados mínimos públicos |
| **DDoS** | L3/L4/L7 | CDN/Anycast, proteção DDoS gerida, autoscaling, rate limiting L7 |
| **API abuse** | Uso indevido de APIs | API Gateway, quotas, schema validation, anomaly detection |
| **Insider threats** | Acesso interno indevido | Least privilege, JIT access, segregation of duties, audit logs imutáveis, DLP, break-glass auditado |
| **Engenharia social** | Suporte/colaboradores | Formação, verificação de identidade em suporte, dupla aprovação para ações críticas |

## Arquitetura em camadas (Defense in Depth)

```
┌──────────────────────────────────────────────────────────────┐
│ EDGE: CDN · Anycast · DDoS protection · WAF · Bot mgmt · GeoIP │
├──────────────────────────────────────────────────────────────┤
│ IDENTITY: OAuth2.1/OIDC · MFA · Passkeys/FIDO2 · Device Trust  │
├──────────────────────────────────────────────────────────────┤
│ API GATEWAY: authN/Z · rate limit · throttling · schema valid.│
├──────────────────────────────────────────────────────────────┤
│ APP (Zero Trust): RBAC + ABAC · least privilege · input valid. │
├──────────────────────────────────────────────────────────────┤
│ DATA: AES-256 at rest · column/field encryption · RLS · KMS    │
├──────────────────────────────────────────────────────────────┤
│ INFRA: network segmentation · private subnets · secrets mgmt   │
├──────────────────────────────────────────────────────────────┤
│ OBSERVABILITY: SIEM · EDR · audit logs · threat detection      │
└──────────────────────────────────────────────────────────────┘
        Cada camada autentica, autoriza e regista de forma independente.
```

## Zero Trust — aplicação concreta
- **Identidade como perímetro**: cada pedido carrega identidade verificada (utilizador + dispositivo + contexto).
- **Microsegmentação**: serviços comunicam via mTLS; sem confiança implícita por estar "na mesma rede".
- **Autorização contextual (ABAC sobre RBAC)**: decisão baseada em papel + pertença à família + sensibilidade do recurso + risco da sessão (novo dispositivo, geolocalização anómala → step-up MFA).
- **JIT & least privilege** para acessos administrativos a produção (acesso temporário, aprovado, auditado).
- **Assume breach**: deteção e contenção desenhadas para o cenário "o atacante já está dentro".

## Segregação multi-tenant
- Isolamento lógico forte por **família**, por **pediatra** e por **clínica (tenant)**.
- **Row-Level Security** (PostgreSQL) + verificação de pertença na aplicação (defesa em profundidade).
- Chaves de encriptação segregáveis por tenant (envelope encryption) para limitar raio de exposição.
- Isolamento de IA por tenant (ver [E06](06-ai-security.md)).

## Gestão de segredos
- **KMS/HSM** para chaves; **Secrets Manager/Vault** para credenciais; rotação automática; sem segredos em código (secret scanning no CI — ver [E09](09-devsecops-pentest-certs.md)).

## Hardening de baseline
- Imagens mínimas (distroless), CIS Benchmarks, sem root em contentores, read-only filesystems, network policies default-deny, patching automatizado.

## Governança de segurança
- **CISO/Security Lead** responsável; política de segurança da informação; classificação de dados (público/interno/confidencial/**clínico-sensível**); revisão periódica.
- Ligação a SecOps/SOC e resposta a incidentes ([E08](08-secops-bcdr.md)) e ao roadmap de certificações ([E09](09-devsecops-pentest-certs.md)).
