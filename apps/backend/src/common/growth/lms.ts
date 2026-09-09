/**
 * WHO / CDC growth-standard mathematics — Cole's LMS method.
 *
 * References (peer-reviewed):
 *  - Cole TJ. The LMS method for constructing normalized growth standards.
 *    Eur J Clin Nutr. 1990;44(1):45-60.
 *  - Cole TJ, Green PJ. Smoothing reference centile curves: the LMS method and
 *    penalized likelihood. Stat Med. 1992;11(10):1305-19.
 *  - WHO Multicentre Growth Reference Study Group (de Onis M, et al.). WHO Child
 *    Growth Standards based on length/height, weight and age. Acta Paediatr
 *    Suppl. 2006;450:76-85.
 *  - de Onis M, et al. Development of a WHO growth reference for school-aged
 *    children and adolescents. Bull World Health Organ. 2007;85(9):660-7.
 *
 * This module is the computation engine ONLY. The official WHO LMS coefficient
 * tables (L, M, S per sex and age, per indicator) must be supplied as data —
 * see docs/25-percentis-who.md. We deliberately never approximate the
 * coefficients themselves, since incorrect reference curves would be clinically
 * unsafe.
 */

export interface Lms {
  L: number;
  M: number;
  S: number;
}

/** Z-score of a measurement given LMS coefficients (Cole & Green, 1992). */
export function lmsZScore(value: number, { L, M, S }: Lms): number {
  if (value <= 0 || M <= 0 || S <= 0) return NaN;
  return L === 0 ? Math.log(value / M) / S : (Math.pow(value / M, L) - 1) / (L * S);
}

/** Measurement value at a given z-score (inverse LMS) — used to draw centile bands. */
export function lmsValueAtZ(z: number, { L, M, S }: Lms): number {
  if (M <= 0 || S <= 0) return NaN;
  return L === 0 ? M * Math.exp(S * z) : M * Math.pow(1 + L * S * z, 1 / L);
}

/**
 * Standard-normal CDF (Abramowitz & Stegun 26.2.17; |error| < 7.5e-8).
 * Returns a probability in [0, 1].
 */
export function normalCdf(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989422804014327 * Math.exp((-z * z) / 2);
  let p =
    d *
    t *
    (0.319381530 +
      t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  p = z > 0 ? 1 - p : p;
  return p;
}

/** Percentile (0–100, one decimal) for a z-score. */
export function zToPercentile(z: number): number {
  return Math.round(normalCdf(z) * 1000) / 10;
}

/** Z-scores of the standard centiles drawn on WHO / CDC growth charts. */
export const CENTILE_Z: { p: number; z: number }[] = [
  { p: 3, z: -1.880794 },
  { p: 15, z: -1.036433 },
  { p: 50, z: 0 },
  { p: 85, z: 1.036433 },
  { p: 97, z: 1.880794 },
];

/**
 * WHO BMI-for-age nutritional classification by z-score.
 * Cutoffs are the official WHO definitions:
 *  - <5y  (WHO 2006): thinness <-2, severe thinness <-3, possible risk of
 *    overweight >+1, overweight >+2, obesity >+3.
 *  - 5-19y (WHO 2007): thinness <-2, severe thinness <-3, overweight >+1,
 *    obesity >+2.
 */
export function classifyBmiForAgeZ(z: number, ageMonths: number): string {
  if (z < -3) return 'magreza acentuada';
  if (z < -2) return 'magreza';
  if (ageMonths < 60) {
    if (z > 3) return 'obesidade';
    if (z > 2) return 'excesso de peso';
    if (z > 1) return 'risco de excesso de peso';
  } else {
    if (z > 2) return 'obesidade';
    if (z > 1) return 'excesso de peso';
  }
  return 'eutrofia';
}

/**
 * Linear interpolation of LMS coefficients between two tabulated ages.
 * WHO tables are tabulated (daily/monthly); for an age between rows the
 * standard practice is linear interpolation of L, M and S.
 */
export function interpolateLms(ageT: number, a: { age: number } & Lms, b: { age: number } & Lms): Lms {
  if (b.age === a.age) return { L: a.L, M: a.M, S: a.S };
  const f = (ageT - a.age) / (b.age - a.age);
  return {
    L: a.L + f * (b.L - a.L),
    M: a.M + f * (b.M - a.M),
    S: a.S + f * (b.S - a.S),
  };
}
