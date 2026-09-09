# E04 · Proteção de Dados & Encriptação

## Classificação de dados
Todos os dados clínicos são tratados como **Special Category Health Data** (art.º 9.º RGPD). Quando respeitam a menores, recebem **proteção reforçada**.

| Classe | Exemplos | Controlo |
|---|---|---|
| **Clínico-sensível** | Sintomas, mensagens clínicas, exames, imagens, notas, vacinas, crescimento | Encriptação a nível de campo/coluna + AES-256 at rest + acesso auditado |
| **PII** | Nome, contacto, dados da criança | Encriptação at rest + minimização |
| **Financeiro** | Pagamentos, faturas, IBAN | Encriptação + segregação + PCI scope mínimo |
| **Operacional** | Logs (sem PII), métricas anonimizadas | Pseudonimização |

> **Regra absoluta: nenhum dado clínico é armazenado sem encriptação.**

## Encriptação

### At Rest
- **AES-256** em toda a persistência (DB, object storage, backups, snapshots).
- **Encriptação a nível de campo/coluna** para dados clínico-sensíveis (envelope encryption): a DB encriptada não basta — os campos sensíveis têm a sua própria camada com **DEKs** (Data Encryption Keys) protegidas por **KEKs** no KMS.
- **Envelope encryption** com chaves segregáveis por tenant/família para limitar o raio de exposição.

### In Transit
- **TLS 1.3** em todas as ligações externas e internas (mTLS service-to-service).
- HSTS, cipher suites modernas, perfect forward secrecy, certificate pinning na app móvel ([E05](05-app-api-file-video-security.md)).

### Gestão de chaves (KMS)
- **KMS/HSM** gerido (AWS KMS/CloudHSM, GCP KMS, ou HSM dedicado) na **UE**.
- **Hierarquia**: KEK (no KMS/HSM) → DEKs (encriptam dados) → rotação.
- **Key Rotation** automática e periódica (KEKs) + re-encriptação programada; rotação de emergência em caso de suspeita de compromisso.
- **Separação de funções**: quem gere chaves ≠ quem acede a dados; acesso a operações de chave auditado.
- **Bring Your Own Key / Hold Your Own Key** considerado para clientes enterprise/clínicas (Fase 3).

## CHILD DATA PROTECTION (dados de menores)

A plataforma assume desde o início que gere **dados de saúde de menores**.

### Consentimento parental obrigatório
- Tratamento de dados de saúde de menor **só** com **consentimento explícito** do titular das responsabilidades parentais, **por criança** e por finalidade, **versionado e imutável** (entidade `Consent`).
- Reapresentação em mudanças materiais; revogação fácil com efeitos registados.

### Gestão de tutela (guardianship)
- Modelo de **responsabilidade parental**: titular(es) primário(s) + tutores/guardiões com **permissões granulares**.
- Suporte a **guarda partilhada** (dois encarregados, possivelmente em conflito): regras de quem pode consentir, ver, partilhar.
- Convites a terceiros (avós, ama) com **acesso limitado, temporário e revogável**.
- Transição de titularidade quando o menor atinge a maioridade (data-driven): plano de migração de controlo para o próprio.

### Auditoria completa
- **Todos os acessos a dados de menores são rastreáveis**: quem, quando, o quê, em que contexto (consulta/partilha), de que dispositivo/IP.
- Audit log **append-only e imutável**, disponível para o titular (transparência) e para Compliance/DPO.

### Controlo granular de acesso
- Acesso clínico concedido **apenas no contexto** de uma consulta ativa ou partilha consentida, com **expiração**.
- Segmentação por criança; um pediatra não vê o histórico que não lhe foi partilhado.
- DLP e deteção de acessos anómalos (volume, fora de contexto).

## Direitos do titular (operacionalizados — ver [E07](07-compliance.md))
- Acesso, retificação, **apagamento** (com conciliação das obrigações legais de retenção fiscal/clínica), portabilidade, oposição, limitação.
- **Exportação** estruturada (portabilidade) e **eliminação** ligada ao fluxo de account deletion das stores.

## Retenção e ciclo de vida
- Políticas de retenção **por categoria**: clínico (segundo normas de saúde), fiscal (prazo legal PT, tipicamente 10 anos — confirmar), operacional (mínimo).
- **Crypto-shredding**: apagamento por destruição de chaves quando o apagamento físico imediato é inviável.
- Minimização: recolher só o necessário; pseudonimização para analytics; **dados clínicos nunca para fins secundários sem base legal**.

## Residência e soberania de dados
- Dados na **UE**; fornecedores com DPA e data residency europeia.
- Preparação para **EHDS** (European Health Data Space): interoperabilidade e portabilidade futuras ([E07](07-compliance.md)).
