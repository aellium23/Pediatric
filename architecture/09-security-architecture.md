# 09 · Security Architecture

*(Cybersecurity Architect)*

Zero Trust + Defense in Depth + Secure by Default. Mapeia o [modelo de ameaças enterprise](../enterprise/02-security-architecture.md) à arquitetura concreta.

## Security diagram — camadas (Defense in Depth)

```mermaid
flowchart TB
    A["L0 EDGE\nCDN · WAF · Shield/DDoS · Bot · GeoIP · TLS 1.3"]
    B["L1 IDENTITY\nOAuth2.1/OIDC · MFA · Passkeys/FIDO2 · Device Trust · App Attest"]
    C["L2 GATEWAY\nAuthZ · schema validation · rate limit · throttling · quotas"]
    D["L3 APP (Zero Trust)\nRBAC+ABAC · least privilege · input validation · mTLS"]
    E["L4 DATA\nAES-256 · field encryption · RLS · KMS/HSM · tokenization"]
    F["L5 INFRA\nprivate subnets · default-deny SG · secrets mgr · hardening (CIS)"]
    G["L6 DETECT/RESPOND\nSIEM · EDR · audit WORM · anomaly detection · IR"]
    A-->B-->C-->D-->E-->F-->G
```

## Zero Trust — pedido autenticado/autorizado em cada salto

```mermaid
sequenceDiagram
    autonumber
    participant App
    participant Edge as Edge/WAF
    participant GW as API Gateway
    participant IdP
    participant Svc as Service
    participant DB as PostgreSQL(RLS)
    App->>Edge: HTTPS (TLS1.3) + cert pinning
    Edge->>GW: filtra (WAF/bot/geo/rate)
    GW->>IdP: valida token (OIDC) + device trust
    IdP-->>GW: claims (role, tenant, risk)
    Note over GW: step-up MFA se risco alto (novo device/geo)
    GW->>Svc: mTLS + contexto (user, tenant, scope)
    Svc->>Svc: ABAC (papel + pertença + consentimento)
    Svc->>DB: query com tenant context (RLS default-deny)
    DB-->>Svc: só linhas autorizadas
    Svc->>Audit: regista acesso clínico (append-only)
```

## Threat model → controlos (resumo; detalhe em [E02](../enterprise/02-security-architecture.md))

```mermaid
mindmap
  root((Ameaças))
    Automatizados/Bots
      WAF
      Rate limit
      App Attest/Play Integrity
    Credenciais
      Passkeys/FIDO2
      MFA
      Breach detection
      Step-up
    Sessão
      Tokens curtos+rotação
      Device binding
      Cert pinning
    DDoS
      CDN/Anycast
      Shield
      Autoscaling
    API Abuse
      Gateway+quotas
      Schema validation
      Anti-IDOR (ABAC+RLS)
    Ficheiros/Malware
      AV scan
      Content validation
      Signed URLs
    Insider
      Least privilege
      JIT+SoD
      Audit WORM
      DLP
    Ransomware
      Backups imutáveis offline
      EDR
      Segmentação
    Fraude
      KYC
      3DS/SCA
      Device fingerprint
```

## IAM (ver [E03](../enterprise/03-iam-authentication.md))
- **OAuth 2.1 / OIDC**, **Passkeys/FIDO2/biometria**; **MFA obrigatório** para pediatras/clínicas/internos.
- **8 perfis** (Parent, Pediatrician, Clinic Staff, Clinic Admin, Platform Admin, Support, Finance, Compliance).
- **RBAC + ABAC** (papel + `family_id`/`tenant_id` + sensibilidade + risco da sessão); **least privilege**, **segregation of duties**, **JIT** para produção.

## Encriptação (ver [doc 04](04-database-architecture.md))
- **In transit**: TLS 1.3 externo + **mTLS** interno; cert pinning na app.
- **At rest**: AES-256 + **field-level (envelope)** para clínico-sensível; **KMS/HSM** + rotação; crypto-shredding.

## Segurança da app móvel (ver [E05](../enterprise/05-app-api-file-video-security.md))
- Jailbreak/root/emulator detection, RASP, anti-tampering, obfuscation, secure storage; **atestação verificada no servidor**.

## Segurança de API & ficheiros & vídeo
- API Gateway + WAF + rate/throttle/bot/geo; **anti-IDOR** (autorização por objeto + RLS).
- Ficheiros: **malware/virus scan + content validation antes de armazenar**; signed URLs curtos; expiring downloads.
- Vídeo: WebRTC/**SRTP**/DTLS/TLS; sem gravação por defeito.

## SecOps & resposta (ver [E08](../enterprise/08-secops-bcdr.md))
- **SIEM + EDR + threat detection**; **audit WORM**; **IR** (deteção→contenção→erradicação→recuperação→lições); **notificação CNPD 72h**; tabletop (ransomware/insider).

## Secure by Default (princípios aplicados)
- Tudo **negado** salvo permitido (rede, RLS, autorização).
- Predefinições mais seguras (MFA on, privacidade máxima, sem tracking).
- **CI bloqueia deploys inseguros** ([doc 11](11-devsecops-architecture.md)).
