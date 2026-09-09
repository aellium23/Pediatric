# 02 · Exportação da ficha em FHIR — o que garantimos e o que não

> **Estado:** implementado a 2026-09-09 · **Fabricante:** DES · **Produto:** HOC
> **Âmbito:** `GET /api/interop/fhir/:childId` e o bloco `records` de
> `GET /api/privacy/export`
> **Código:** `apps/backend/src/modules/interop/fhir.ts` (mapeamento puro) e
> `interop.module.ts` (leitura, decifra e autorização)

---

## 1. Porquê agora, e não em M22

O EHDS **aplica-se a partir de 26 de março de 2027**; a primeira vaga de troca
de dados prioritários é **março de 2029**, no formato europeu **EEHRxF**, que
assenta em FHIR. O roadmap punha "leitura EEHRxF" em M22–24 — o que, em
calendário, chega a tempo.

Isso não é motivo para esperar. O custo de escrever um exportador não depende
da data: depende de **quantos dados reais existem quando se escreve**. Hoje a
base tem dados de piloto e o exportador custou um dia. Depois de três anos de
histórico de famílias reais, a mesma peça é um projeto de migração com
retrocompatibilidade, correções de dados e um período em que o formato antigo e
o novo têm de coexistir.

Há ainda uma razão que não é de calendário: o RGPD já obriga. O artigo 20.º
exige um formato **"estruturado, de uso corrente e de leitura automática"**. A
exportação que existia devolvia conta, crianças, consultas, consentimentos,
subscrições e notificações — estruturada e legível por máquina, mas de uso
corrente **só por nós**, e sem uma única linha do registo clínico. Uma família
que descarregasse os seus dados recebia a metade administrativa e nada da ficha
que a fez usar o produto. Isso está corrigido: o `records` da exportação leva
agora um Bundle por criança.

---

## 2. O que é gerado

Um **FHIR R4 `Bundle`** de tipo `collection`, com um recurso por facto clínico.

| O que guardamos | Recurso FHIR | Código emitido |
|---|---|---|
| Criança | `Patient` | nº de utente como `identifier` (sistema local) |
| Peso, altura, perímetro cefálico | `Observation` (uma por valor) | LOINC 29463-7 / 8302-2 / 9843-4 |
| Temperatura, FC, FR, SpO₂ | `Observation` | LOINC 8310-5 / 8867-4 / 9279-1 / 59408-5 |
| Tensão arterial | `Observation` com dois `component` | LOINC 85354-9 + 8480-6 / 8462-4 |
| Alergias | `AllergyIntolerance` | código do nosso catálogo, se existir |
| Vacinas | `Immunization` | CVX, se existir |
| Medicação | `MedicationStatement` | ATC, se existir |
| Problemas de saúde | `Condition` | ICD-10 e ICPC-2, se existirem |
| Documentos do cofre | `DocumentReference` | — (referência, sem os bytes) |

As unidades são UCUM (`kg`, `cm`, `Cel`, `/min`, `%`, `mm[Hg]`), não texto.

---

## 3. A regra que o ficheiro inteiro obedece

> **Um código só é emitido quando o temos mesmo.**

Onde guardamos texto livre — uma alergia que um pai escreveu, uma vacina
copiada de um boletim em papel — sai como `text`, sem `coding`. Não há
inferência de SNOMED CT, de ATC nem de código de vacina a partir de português
livre.

A razão é a mesma que governa a leitura de documentos por IA: um sistema que
recebe o ficheiro **confia na `coding` e ignora o `text`**. Um código adivinhado
não produz uma exportação imperfeita — produz uma exportação errada com
aparência de correta, que entra no registo do outro lado sem ninguém a rever. É
preferível uma exportação visivelmente parcial.

A abreviatura do PNV é o caso limítrofe: identifica uma posição no calendário
nacional, não a vacina, por isso viaja como nota e não como `coding`.

---

## 4. O que um sistema recetor **não** pode assumir

- **Não há conformidade declarada com qualquer perfil.** Nem IPS, nem EEHRxF,
  nem perfil nacional. É FHIR R4 base.
- **Não foi validado pelo validador oficial da HL7.** É validado pelos nossos
  testes (30 unitários + 10 end-to-end), que verificam estrutura, códigos,
  unidades e resolução de referências — não conformidade formal.
- **Dois sistemas de nomes são locais e opacos:** `urn:pedia:sns-utente` para o
  número de utente e `urn:pedia:allergen` para o catálogo de alergénios.
  **Nenhum dos dois está registado.** Antes de qualquer troca transfronteiriça
  real, o primeiro tem de passar a usar o sistema de nomes oficial português e
  o segundo tem de ser mapeado para SNOMED CT.
- **Percentis e IMC não são exportados.** São derivados das medições pelas
  curvas da OMS; quem recebe as medições calcula-os. Exportar um valor derivado
  convida a discordâncias sobre qual dos dois está certo.
- **Consultas não são exportadas como `Encounter`.** Os metadados das consultas
  vão na exportação RGPD; não há ainda uma nota clínica estruturada que
  justifique um `Encounter`.
- **`gender` é o sexo de registo**, o que usamos para as curvas de crescimento,
  não o género administrativo que o campo FHIR designa. É o menos errado num
  registo pediátrico e está dito aqui em vez de ficar implícito.

---

## 5. Segurança e proteção de dados

- **Só o pai/mãe exporta** (`@Roles(PARENT)`), com a regra de acesso partilhada
  (`ChildAccessService`), 10 pedidos por minuto. Um pediatra lê a ficha dentro
  da consulta em que participa; uma descarga completa do registo de uma família
  é uma forma diferente de saída de dados e não lhe pertence pedi-la.
- **Os campos clínicos estão cifrados em repouso** (AES-256-GCM) e são
  decifrados na exportação. Há um teste end-to-end que verifica as duas metades
  ao mesmo tempo — texto legível no Bundle, ciphertext na base — porque exportar
  ciphertext seria uma falha silenciosa com aspeto de sucesso.
- **Os ficheiros do cofre não são embutidos.** O `DocumentReference` leva tipo,
  tamanho, título e o URL do endpoint autenticado. Embutir PDFs produziria um
  JSON de vários MB que nenhum importador trata bem, e poria os bytes num
  ficheiro que acaba na pasta de transferências.
- **O nome do ficheiro descarregado não tem o nome da criança** — só a data. Um
  nome de ficheiro passa pela pasta de transferências, por cópias de segurança e
  por sincronizações para a nuvem.

---

## 6. O que fica por decidir (proposta nº 7 do roadmap)

A pergunta anterior a tudo isto continua sem resposta e é jurídica, não técnica:
**o HOC, ao posicionar-se como o registo de saúde da criança, é um "sistema EHR"
na aceção do EHDS?** Se for, herda obrigações de certificação de
interoperabilidade — e aí esta exportação deixa de ser uma cortesia ao RGPD e
passa a ser uma obrigação com requisitos formais, incluindo conformidade com o
EEHRxF e validação por terceiros.

Esta implementação não decide essa questão. Torna-a mais barata de responder:
o mapeamento existe, está isolado num ficheiro puro e testado, e o que falta
para conformidade formal está listado na secção 4 em vez de ser descoberto
durante uma auditoria.

---

## 7. Fontes

- Regulamento (UE) 2025/327 (EHDS) — aplicação a 26 de março de 2027; dados
  prioritários a partir de março de 2029.
- RGPD, artigo 20.º — direito de portabilidade dos dados.
- HL7 FHIR R4 (v4.0.1) — `Bundle`, `Patient`, `Observation`,
  `AllergyIntolerance`, `Immunization`, `MedicationStatement`, `Condition`,
  `DocumentReference`.
- LOINC · UCUM · CVX (CDC) · ATC (WHOCC) · ICD-10 · ICPC-2.

*Última atualização: 2026-09-09.*
