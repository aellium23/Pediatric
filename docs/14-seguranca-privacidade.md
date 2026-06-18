# 14 · Requisitos de Segurança e Privacidade

Princípio: **security & privacy by design and by default**. Dados de saúde de menores exigem o nível mais alto.

## Identidade e acesso
- **MFA obrigatório** para **pediatras** e **admin**; opcional/incentivado para pais.
- **RBAC** (papéis: parent, family_member com permissões, pediatrician, admin, support) + **least privilege**.
- **Row-Level Security (Postgres)**: acesso a dados clínicos sempre filtrado por `family_id`/pertença; defesa em profundidade além da lógica de aplicação.
- Sessões com tokens curtos + refresh; revogação; deteção de dispositivos novos.
- Política de **passwords**/passkeys; suporte a **passkeys/WebAuthn** desejável.

## Encriptação
- **Em trânsito**: TLS 1.2+ em tudo (apps, API, integrações, DB). HSTS.
- **Em repouso**: encriptação de DB e **object storage (SSE-KMS)**; campos de saúde sensíveis com **encriptação a nível de aplicação/coluna** (chaves geridas por KMS, rotação).
- **Ficheiros clínicos**: URLs **assinados de curta duração**; sem acesso público; scan de malware no upload.
- **E2E**: avaliar encriptação ponta-a-ponta no chat — tensão com necessidade de o médico/registo clínico aceder e com resumos AI. **Recomendação MVP**: encriptação forte em trânsito e repouso + acesso estritamente controlado e auditado (não E2E pura), para permitir registo clínico, faturação e auditoria. Reavaliar E2E seletiva mais tarde.

## Gestão de consentimentos
- Consentimentos **versionados, com timestamp e evidência**, imutáveis (entidade `Consent`).
- Tipos: dados de saúde (por criança), teleconsulta, termos, privacidade, marketing (opt-in separado).
- Revogação fácil; efeitos registados.

## Segregação de dados
- **Por família e por criança**; um pediatra só acede aos dados partilhados no contexto de uma consulta/partilha ativa.
- **Partilha entre médicos** sempre consentida, com **expiração** e revogável.
- Ambientes (dev/staging/prod) isolados; **dados reais nunca** em dev (usar dados sintéticos).

## Auditoria e registo
- **AuditLog append-only** de todos os acessos a dados clínicos e ações sensíveis (quem, quando, o quê, IP).
- Trilho para disputas/chargebacks e para direitos RGPD.
- Logs sem PII desnecessária; mascaramento; retenção definida.

## Resiliência
- **Backups** encriptados, testados (restore drills), retidos com política; **PITR** na DB.
- **DR/RTO/RPO** definidos; multi-AZ; plano de continuidade.

## Resposta a incidentes
- **Plano de resposta a incidentes** (deteção, contenção, erradicação, recuperação, comunicação).
- **Notificação de violações em 72h à CNPD** + titulares quando aplicável.
- Runbooks; on-call; pós-mortems sem culpa.

## Monitorização e deteção
- SIEM/centralização de logs; alertas de anomalias (acessos massivos, exfiltração, brute force).
- **WAF**, rate limiting, proteção DDoS, bot protection no marketplace/auth.
- **Secret scanning**, dependency scanning (SCA), SAST/DAST no CI.

## Testes e certificações
- **Pentests** periódicos (antes do lançamento e anuais) + bug bounty mais tarde.
- **OWASP ASVS** como baseline; OWASP Top 10 / Mobile Top 10 cobertos.
- Roadmap de **ISO 27001** (SGSI) e **SOC 2 Type II** numa fase posterior (exigência de seguradoras/clínicas/enterprise). HDS (França) se expandir para FR e alojar lá dados de saúde.

## Pagamentos
- **PCI-DSS SAQ A** (tokenização do PSP, nunca tocar PAN). 3-D Secure/SCA. Webhooks assinados, idempotência, reconciliação.

## Privacidade desde o desenho
- **Minimização**: recolher só o necessário por funcionalidade.
- **Pseudonimização/anonimização** para analytics; nunca usar dados clínicos para fins secundários sem base legal.
- **Definições de privacidade** claras ao utilizador; exportação e eliminação self-service (ou via suporte no MVP).
- **Data residency UE** em todos os fornecedores; DPAs assinados.

## Checklist de segurança para o MVP
- [ ] MFA pediatras/admin · RBAC · RLS
- [ ] TLS em tudo · encriptação repouso + coluna p/ saúde · KMS
- [ ] Storage privado · URLs assinados · malware scan
- [ ] Consentimentos versionados · AuditLog append-only
- [ ] Backups testados · PITR · plano de incidentes
- [ ] WAF · rate limit · secret/dep scanning · CI security gates
- [ ] Pentest pré-lançamento · DPIA concluída
- [ ] DPAs com todos os subcontratantes · dados UE
