# E03 · IAM & Autenticação

## Normas e protocolos
- **OAuth 2.1** (authorization framework consolidado: PKCE obrigatório, sem implicit/ROPC).
- **OpenID Connect (OIDC)** para autenticação e federação (Apple, Google).
- **FIDO2/WebAuthn** + **Passkeys** (phishing-resistant), com fallback.
- Tokens: **access token** curto (5–15 min) + **refresh token** rotativo (com deteção de reutilização = revogação).
- **mTLS** entre serviços internos.

## Provider de identidade
- IdP gerido (ex.: **Auth0/Okta, AWS Cognito, Keycloak self-host EU, Clerk**) com suporte OAuth 2.1/OIDC, MFA, passkeys e device trust. Decisão registada em ADR; preferência por residência de dados UE.

## Métodos de autenticação

### Obrigatórios (oferta)
- **Sign in with Apple** (OIDC)
- **Sign in with Google** (OIDC)
- **Email** (magic link / OTP)
- **Telefone** (OTP SMS)

### Suportados
- **Passkeys** (sincronizadas iCloud/Google ou device-bound)
- **FIDO2** (chaves de segurança para perfis de alto risco)
- **Biometria** local (Face ID / Touch ID / Android BiometricPrompt) para desbloqueio e step-up

### MFA
- **Obrigatório** para **Pediatras**, **Clinic Staff/Admin**, **Platform Admin**, **Support**, **Finance**, **Compliance**.
- Incentivado (e por defeito) para **Pais**; obrigatório para ações sensíveis (alterar IBAN, exportar dados, eliminar conta).
- Fatores: passkey (preferido), TOTP, push, WebAuthn; SMS apenas como fallback.

### Device Trust
- Registo e **fingerprint de dispositivos**; estado de confiança (novo/conhecido/comprometido via Play Integrity/App Attest).
- **Step-up authentication** em sinais de risco (novo dispositivo, geolocalização anómala, ação sensível).
- Gestão de dispositivos pelo utilizador (ver/remover sessões e dispositivos).

## RBAC + ABAC — Perfis e permissões

| Perfil | Âmbito | Exemplos de permissões |
|---|---|---|
| **Parent** | A sua família/crianças | Gerir crianças, iniciar consultas, ver faturas próprias |
| **Pediatrician** | Consultas atribuídas | Responder, notas clínicas, definir serviços/preços, ver finanças próprias |
| **Clinic Staff** | Tenant da clínica (operacional) | Agendar, triagem administrativa, gerir consultas da clínica |
| **Clinic Administrator** | Tenant da clínica (gestão) | Gerir pediatras/staff da clínica, faturação da clínica, relatórios |
| **Platform Administrator** | Plataforma | Validar pediatras, configuração, gestão de utilizadores |
| **Support** | Operacional | Tickets, ver dados estritamente necessários (mascarados), sem acesso clínico amplo |
| **Finance** | Financeiro | Pagamentos, payouts, reembolsos, faturação, relatórios financeiros |
| **Compliance** | Compliance/DPO | Audit logs, pedidos RGPD, DPIA, retenção, sem alterar dados clínicos |

### Modelo de autorização
- **RBAC** define o papel base; **ABAC** refina por atributos: `family_id`, `tenant_id`, sensibilidade do recurso, risco da sessão, consentimentos ativos.
- **Least Privilege** + **Segregation of Duties** (ex.: quem aprova reembolso ≠ quem o executa; quem valida pediatra ≠ quem o paga).
- **Acesso clínico mínimo**: Support e Finance **não** acedem a conteúdo clínico salvo necessidade justificada, com **break-glass** auditado.
- **JIT (Just-In-Time)** para acessos administrativos a produção: temporário, aprovado, com expiração e log.

## Ciclo de vida de identidade
- **Onboarding** com verificação (KYC pediatras: identidade + cédula; ver blueprint J11).
- **Joiner-Mover-Leaver** para staff interno e de clínicas (provisionamento/desprovisionamento automático, SCIM onde aplicável).
- **Revisões de acesso** periódicas (access recertification) para perfis privilegiados.
- **Offboarding** imediato com revogação de tokens/sessões.

## Proteções de conta
- Deteção de **credential stuffing** (rate limit, breach check, CAPTCHA adaptativo).
- Bloqueio progressivo, alertas de login suspeito, notificação de novo dispositivo.
- **Account recovery** seguro (não baseado só em SMS; verificação multifator).
- Todas as ações de IAM em **audit log imutável** ([E08](08-secops-bcdr.md)).
