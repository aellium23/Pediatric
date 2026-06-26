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

## O que falta (apenas dados — sem código novo no motor)
Integrar as tabelas LMS oficiais como `apps/backend/src/common/growth/who-lms.<indicador>.json`
no formato `{ sex: 'M'|'F', age: number /* dias ou meses */, L, M, S }[]`.

Fontes oficiais (a versionar, com proveniência):
- WHO Child Growth Standards (0–5 anos): length/height-for-age,
  weight-for-age, **BMI-for-age**, head-circumference-for-age, weight-for-length/height.
  Repo oficial: `WorldHealthOrganization/anthro` (tabelas LMS expandidas).
- WHO Reference 2007 (5–19 anos): BMI-for-age, height-for-age, weight-for-age.

Indicadores prioritários (maior valor clínico): **BMI-for-age** (rastreio de
magreza/excesso/obesidade) e **length/height-for-age** + **weight-for-age**.

## Passo de ligação (quando os dados entrarem)
1. Colocar os JSON LMS (com a referência/URL da WHO no cabeçalho do commit).
2. `health-records.overview()` passa a anexar, por medição:
   `z` e `percentile` (via `lmsZScore` + `zToPercentile`) e, para o IMC,
   `classification` (via `classifyBmiForAgeZ`).
3. O gráfico (`GrowthChart` na web) desenha as bandas P3–P97 com `lmsValueAtZ`
   sobre os pontos da criança.

## Referências
- Cole TJ, Green PJ. *Smoothing reference centile curves: the LMS method and
  penalized likelihood.* Stat Med. 1992;11(10):1305-19.
- de Onis M, et al. *WHO Child Growth Standards.* Acta Paediatr Suppl. 2006;450:76-85.
- de Onis M, et al. *WHO growth reference for school-aged children and
  adolescents.* Bull World Health Organ. 2007;85(9):660-7.
