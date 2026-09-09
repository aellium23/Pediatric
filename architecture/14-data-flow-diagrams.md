# 14 · Data Flow Diagrams (DFDs)

*(Principal Solution Architect)*

Fluxos de dados ponta-a-ponta dos cenários críticos. Complementam os DFDs de pagamento no [doc 07](07-payments-architecture.md).

## DFD-1 · Onboarding de pai + criança (com consentimento)

```mermaid
flowchart LR
    Pai((Pai)) -->|registo Apple/Google/OTP| IdP[IdP OIDC]
    IdP --> Core[Core API]
    Pai -->|dados criança| Core
    Core -->|verifica tutela| Guard[Guardianship]
    Core -->|pede consentimento saúde| Consent[Consent Service]
    Pai -->|consente explícito| Consent
    Consent -->|imutável| Audit[(Audit WORM)]
    Core -->|cria Child + HealthProfile cifrado| PG[(PostgreSQL + RLS)]
    PG -->|campos sensíveis| FE[Field Encryption] --> KMS[(KMS)]
```

## DFD-2 · Consulta por mensagem (início → resposta → fecho)

```mermaid
flowchart TB
    Pai((Pai)) -->|triagem + anexos| GW[API Gateway]
    GW -->|red flags?| Triage[Triage]
    Triage -->|sinal de alarme| Warn[/Aviso SNS 24 / 112/]
    GW --> Consult[Consultations]
    Consult -->|hold/escrow| Pay[Payments → PSP]
    Consult -->|estado=aberta, SLA timer| PG[(PostgreSQL)]
    Pai -->|mensagens/ficheiros| RT[Realtime GW]
    RT --> Redis[(Redis pub/sub)]
    Ped((Pediatra)) -->|responde| RT
    Ped -->|encerra + resumo validado| Consult
    Consult -->|consultation.closed| Bus[(Event Bus)]
    Bus --> Pay2[Capture + Split]
    Bus --> Inv[Invoicing → Faturação AT]
    Bus --> Notif[Notifications → pai]
    Consult -->|acessos clínicos| Audit[(Audit WORM)]
```

## DFD-3 · Upload de ficheiro clínico (scan antes de armazenar)

```mermaid
flowchart LR
    App((App)) -->|pede signed URL| Core[Core API]
    Core -->|autoriza por criança/consulta| Pol[ABAC + RLS]
    Core -->|signed URL curto| App
    App -->|PUT ficheiro| Quar[(Quarantine bucket)]
    Quar --> Scan[Malware/Virus Scan + Content Validation]
    Scan -->|limpo| Enc[Encripta AES-256]
    Enc --> Store[(Object Storage SSE-KMS)]
    Scan -->|infetado| Reject[/Rejeita + alerta/]
    Store -->|metadados| PG[(PostgreSQL)]
    Store --> Audit[(Audit)]
```

## DFD-4 · Videochamada (agendamento → sessão → pós-consulta)

```mermaid
flowchart TB
    Pai((Pai)) -->|escolhe slot + consentimento teleconsulta| Sched[Scheduling]
    Sched -->|pagamento na marcação| Pay[Payments → PSP]
    Sched -->|cria sessão + token curto| Video[Video Provider EU]
    Pai -->|sala de espera + verif. device| Video
    Ped((Pediatra)) -->|admite| Video
    Pai <-->|SRTP/DTLS media| Ped
    Ped -->|notas clínicas| Core[Core API]
    Core -->|resumo pós-consulta| Notif[Notifications]
    Core -->|captura + split + fatura| Bus[(Event Bus)]
    Core --> Audit[(Audit WORM)]
    Note1[/Sem gravação por defeito/]
```

## DFD-5 · Direitos RGPD (acesso / apagamento / portabilidade)

```mermaid
flowchart LR
    Titular((Titular/Pai)) -->|pedido DSR| DSR[Data Subject Rights]
    DSR -->|verifica identidade + MFA| IdP[IdP]
    DSR -->|recolhe dados escopados| Core[Domínios]
    Core -->|export FHIR/estruturado| Out[/Pacote de portabilidade/]
    DSR -->|apagamento| Ret[Retention Engine]
    Ret -->|crypto-shredding| KMS[(KMS destrói DEK)]
    Ret -->|concilia retenção fiscal/clínica| PG[(PostgreSQL)]
    DSR --> Audit[(Audit WORM)]
```

## DFD-6 · Resumo por IA (human-in-the-loop)

```mermaid
flowchart LR
    Consult[Consultations] -->|escopo tenant| AI[AI Service]
    AI -->|guard + redact PII/PHI| Prep[Pré-processamento]
    Prep -->|sem PII direta| LLM[LLM EU / self-host]
    LLM -->|rascunho| DLP[Output DLP]
    DLP --> AI
    AI -->|rascunho 'a validar'| Ped((Pediatra))
    Ped -->|edita + VALIDA| Consult
    AI --> AuditAI[(AI Audit imutável)]
```

## Classificação de dados nos fluxos
| Fluxo | Dado mais sensível | Proteção dominante |
|---|---|---|
| DFD-1 | Perfil de saúde da criança | Consentimento + field encryption + RLS |
| DFD-2 | Mensagens/anexos clínicos | Escrow pagamento + audit + encriptação |
| DFD-3 | Ficheiros clínicos | Scan + AES-256 + signed URLs |
| DFD-4 | Media de vídeo | SRTP + sem gravação + EU |
| DFD-5 | Conjunto de dados do titular | MFA + crypto-shred + conciliação legal |
| DFD-6 | Conteúdo clínico → LLM | Redação PII/PHI + EU boundary + DLP + audit |

> Todos os fluxos atravessam as camadas de Defense in Depth ([doc 09](09-security-architecture.md)) e registam acessos clínicos em **audit append-only**.
