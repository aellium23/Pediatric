# E07 · RGPD & Compliance de Saúde (PT + Europa)

> Orientação de arquitetura de compliance. As posições regulatórias **finais** carecem de validação jurídica especializada — ver [doc 18 do blueprint](../docs/18-perguntas-criticas.md).

## RGPD — operacionalização

| Requisito | Implementação |
|---|---|
| **Consent Management** | Plataforma de consentimentos versionados, granulares (por criança, por finalidade), imutáveis, revogáveis; opt-in separado para marketing |
| **Right to Access** | Exportação self-service / via Compliance dos dados do titular |
| **Right to Rectification** | Edição de dados; correções clínicas por adenda (registo imutável) |
| **Right to Erasure** | Fluxo de apagamento (account deletion in-app) + **crypto-shredding**, conciliando retenção legal |
| **Right to Portability** | Exportação estruturada e legível por máquina (preparar formatos EHDS) |
| **Data Retention Policies** | Políticas por categoria (clínico/fiscal/operacional), automatizadas |
| **DPIA** | Avaliação de impacto (dados de saúde de menores em larga escala) **antes do go-live**; revista a cada mudança material |
| **Records of Processing (RoPA)** | Registo de atividades de tratamento (art.º 30.º) mantido e versionado |

**Papéis e estruturas:**
- **DPO** nomeado (provável obrigatoriedade — categorias especiais em larga escala).
- **DPAs** com todos os subcontratantes (cloud, PSP, faturação, vídeo, notificações, IA), residência UE.
- **Controlador vs subcontratante**: clarificar o papel da plataforma face aos pediatras/clínicas (provável **controladores conjuntos** ou plataforma como subcontratante do médico para parte do tratamento) — definir com jurista; redigir acordos de controladoria conjunta onde aplicável.
- **Violações de dados**: deteção → avaliação → **notificação à CNPD em 72h** + titulares quando aplicável; runbook em [E08](08-secops-bcdr.md).

## Portugal — saúde

| Área | Consideração |
|---|---|
| **RGPD (Lei 58/2019)** | Especificidades nacionais; idade de consentimento digital; tratamento por profissionais de saúde |
| **ERS** | Avaliar se a plataforma/médicos configuram estabelecimento prestador sujeito a registo; modelo de intermediário ([doc 13](../docs/13-riscos-legais.md)) |
| **Ordem dos Médicos** | Deontologia da telemedicina, identificação do médico, registo clínico, publicidade, validação de cédula |
| **Telemedicina** | Enquadramento da teleconsulta; consentimento informado; prescrição eletrónica (PEM) |
| **Autoridade Tributária** | Faturação certificada, ATCUD, QR, SAF-T, IVA/isenção ([doc 12](../docs/12-faturacao-portugal.md)) |

## Europa — arquitetura preparada para expansão

| Regulação | Relevância | Preparação na arquitetura |
|---|---|---|
| **RGPD** | Base comum UE | Já central; data residency UE |
| **EHDS (European Health Data Space)** | Uso primário (acesso/portabilidade do utilizador aos dados de saúde) e secundário (investigação, com salvaguardas) | Modelo de dados **interoperável** (preparar **HL7 FHIR**), portabilidade, formatos europeus de registo de saúde; consentimento e controlo do titular |
| **NIS2** | Cibersegurança de entidades essenciais/importantes — saúde digital pode estar abrangida | SecOps, gestão de risco, reporte de incidentes, governança (já alinhado com [E02](02-security-architecture.md)/[E08](08-secops-bcdr.md)); registar obrigações de reporte |
| **DORA** | Resiliência operacional digital — aplica-se a entidades financeiras; **relevante via parceiros (PSP/seguradoras)** e se a Pédia prestar serviços a entidades financeiras | Gestão de risco de ICT, testes de resiliência, gestão de terceiros críticos; avaliar aplicabilidade direta vs indireta |
| **ePrivacy** | Cookies, comunicações eletrónicas, marketing | Consentimento de cookies/tracking; opt-in de comunicações; sem tracking de saúde para ads |
| **AI Act** | Sistemas de IA (saúde tende a alto risco) | Manter IA fora de uso clínico autónomo; documentar gestão de risco/transparência ([E06](06-ai-security.md)) |
| **MDR** | Software como dispositivo médico | Desenhar para **não** ser dispositivo médico ([doc 13](../docs/13-riscos-legais.md)) |

### Estratégia de compliance multi-país
- Camada de **regras plugáveis por país** (consentimentos, retenção, fiscal — ver `TaxRule`/`Country` no [modelo de dados](../docs/10-modelo-dados.md)).
- **Não assumir** que o enquadramento PT se replica: cada país requer validação local (jurídica, fiscal, regulatória de saúde).
- **Localização de DPAs** e de autoridades de controlo por país; representação local quando exigida.
- **EHDS-ready** como vantagem competitiva e requisito futuro de mercado.

## Mapa de prontidão de compliance (gates)
| Gate | Antes de | Itens |
|---|---|---|
| **G1** | Beta com dados reais | DPIA, DPO, RoPA, consentimentos, DPAs, encriptação, audit logs |
| **G2** | Lançamento público PT | Pareceres ERS/Ordem/MDR, faturação certificada, termos/políticas revistos |
| **G3** | Expansão ES/UE | Validação local, EHDS readiness, NIS2/DORA assessment, localização legal |
| **G4** | Enterprise/seguradoras | ISO 27001, SOC 2 Type II ([E09](09-devsecops-pentest-certs.md)) |
