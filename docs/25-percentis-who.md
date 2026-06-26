# 25 · Percentis WHO — motor LMS e integração de dados

## Decisão de integridade clínica
As curvas de percentis pediátricas têm de ser **exatas**. Por isso **não**
transcrevemos os coeficientes LMS oficiais de memória nem por OCR/sumarização —
um coeficiente errado produz uma linha de percentil clinicamente perigosa. A
abordagem é: **motor de cálculo implementado e testado** + **tabelas oficiais
WHO integradas como ficheiro de dados versionado**.

## O que já está feito (código, testado em CI)
`apps/backend/src/common/growth/lms.ts` — método LMS de Cole:
- `lmsZScore(value, {L,M,S})` — z-score (Cole & Green, 1992).
- `lmsValueAtZ(z, {L,M,S})` — inverso, para desenhar bandas de percentil.
- `normalCdf(z)` / `zToPercentile(z)` — z ↔ percentil (Abramowitz & Stegun 26.2.17).
- `CENTILE_Z` — z-scores dos percentis padrão (P3/P15/P50/P85/P97).
- `classifyBmiForAgeZ(z, ageMonths)` — classificação nutricional WHO
  (2006 <5 anos; 2007 5–19 anos): magreza/eutrofia/excesso/obesidade.
- `interpolateLms(...)` — interpolação linear entre idades tabuladas.

Testes: `apps/backend/test/unit/growth-lms.spec.ts` (round-trip value↔z,
probabilidades normais conhecidas, cutoffs WHO, interpolação).

## Dados integrados ✅ (0–5 anos)
Tabelas LMS oficiais em `apps/backend/src/common/growth/data/who-lms.<ind>.ts`
(`wfa`, `lhfa`, `bfa`, `hcfa`), no formato `[sex, ageDays, L, M, S]`. Obtidas
**byte-exact** (curl, sem OCR/sumarização) do pacote oficial
`WorldHealthOrganization/anthro` (`data-raw/growthstandards/*.txt`); idade em
dias 0–1826, sexo 1=rapazes 2=raparigas.

Serviço `who-growth.ts`: `evaluate(indicator, sex, ageDays, value)` → z +
percentil; `evaluateBmi(...)` acrescenta a classificação nutricional WHO;
`centileBands(...)` gera as curvas P3–P97. Testado em `who-growth.spec.ts`
contra as medianas WHO conhecidas.

Ligação feita:
1. `health-records.overview()` anexa por medição `weightP/Z`, `heightP/Z`,
   `bmiP/Z` + `bmiClass`, e `whoBands` (P3–P97) quando o **sexo** é conhecido.
2. A web desenha as bandas WHO sob os pontos da criança (`WhoGrowthChart`) e
   mostra os percentis/classificação por medição; o formulário de criança
   captura o sexo.

## Por fazer (extensão)
- **WHO Reference 2007 (5–19 anos)**: BMI/height/weight-for-age (tabelas
  separadas; hoje só 0–5 anos). Mesmo motor, novos ficheiros de dados.
- weight-for-length/height (`wflanthro`/`wfhanthro`) se necessário.

## Referências
- Cole TJ, Green PJ. *Smoothing reference centile curves: the LMS method and
  penalized likelihood.* Stat Med. 1992;11(10):1305-19.
- de Onis M, et al. *WHO Child Growth Standards.* Acta Paediatr Suppl. 2006;450:76-85.
- de Onis M, et al. *WHO growth reference for school-aged children and
  adolescents.* Bull World Health Organ. 2007;85(9):660-7.
