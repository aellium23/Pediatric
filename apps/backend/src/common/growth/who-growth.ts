/**
 * WHO growth-standard evaluation: turns a child's measurement into a z-score,
 * percentile and (for BMI) nutritional classification, using the official WHO
 * Child Growth Standards (0–5y) LMS tables and the Cole LMS engine in `lms.ts`.
 *
 * The LMS coefficient tables in ./data/who-lms.*.json are the genuine WHO
 * values (age in days 0–1826, sex 1=boys/2=girls), fetched byte-exact from the
 * official `WorldHealthOrganization/anthro` package — never transcribed or
 * approximated (see docs/25).
 */
import {
  Lms,
  lmsZScore,
  lmsValueAtZ,
  zToPercentile,
  classifyBmiForAgeZ,
  interpolateLms,
  CENTILE_Z,
} from './lms';
import { ROWS as WFA } from './data/who-lms.wfa';
import { ROWS as LHFA } from './data/who-lms.lhfa';
import { ROWS as BFA } from './data/who-lms.bfa';
import { ROWS as HCFA } from './data/who-lms.hcfa';

export type Indicator = 'wfa' | 'lhfa' | 'bfa' | 'hcfa';
/** WHO Child Growth Standards cover 0–5 years (0–1826 days). */
export const WHO_MAX_AGE_DAYS = 1826;

interface AgeLms extends Lms {
  age: number;
}

const RAW: Record<Indicator, number[][]> = { wfa: WFA, lhfa: LHFA, bfa: BFA, hcfa: HCFA };

// Index by sex into age-sorted arrays once, at module load.
const INDEX: Record<Indicator, Record<1 | 2, AgeLms[]>> = (() => {
  const out = {} as Record<Indicator, Record<1 | 2, AgeLms[]>>;
  (Object.keys(RAW) as Indicator[]).forEach((ind) => {
    const bySex: Record<1 | 2, AgeLms[]> = { 1: [], 2: [] };
    for (const [sex, age, L, M, S] of RAW[ind]) {
      if (sex === 1 || sex === 2) bySex[sex].push({ age, L, M, S });
    }
    bySex[1].sort((a, b) => a.age - b.age);
    bySex[2].sort((a, b) => a.age - b.age);
    out[ind] = bySex;
  });
  return out;
})();

/** Map a free-text sex to the WHO code (1 boys / 2 girls), or null if unknown. */
export function sexCode(sex?: string | null): 1 | 2 | null {
  if (!sex) return null;
  const s = sex.trim().toLowerCase();
  if (s.startsWith('m')) return 1; // M / masculino / male
  if (s.startsWith('f')) return 2; // F / feminino / female
  return null;
}

/** LMS coefficients at an exact age (days), interpolating between table rows. */
function lmsAt(indicator: Indicator, sex: 1 | 2, ageDays: number): Lms | null {
  if (!(ageDays >= 0) || ageDays > WHO_MAX_AGE_DAYS) return null;
  const arr = INDEX[indicator][sex];
  if (!arr.length) return null;
  // Daily contiguous tables → direct index when it lines up (the common case).
  const guess = arr[Math.round(ageDays)];
  if (guess && guess.age === ageDays) return { L: guess.L, M: guess.M, S: guess.S };
  // Otherwise binary-search the bracketing rows and interpolate.
  let lo = 0;
  let hi = arr.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (arr[mid].age < ageDays) lo = mid + 1;
    else hi = mid;
  }
  const upper = arr[lo];
  if (upper.age === ageDays) return { L: upper.L, M: upper.M, S: upper.S };
  const lower = arr[Math.max(0, lo - 1)];
  return interpolateLms(ageDays, lower, upper);
}

export interface GrowthEval {
  z: number;
  percentile: number;
}

/** Evaluate a measurement for an indicator; null if out of range or no data. */
export function evaluate(
  indicator: Indicator,
  sex: 1 | 2,
  ageDays: number,
  value: number,
): GrowthEval | null {
  const lms = lmsAt(indicator, sex, ageDays);
  if (!lms || !(value > 0)) return null;
  const z = lmsZScore(value, lms);
  if (!Number.isFinite(z)) return null;
  return { z: Math.round(z * 100) / 100, percentile: zToPercentile(z) };
}

/** BMI-for-age with the WHO nutritional classification. */
export function evaluateBmi(
  sex: 1 | 2,
  ageDays: number,
  bmi: number,
): (GrowthEval & { classification: string }) | null {
  const e = evaluate('bfa', sex, ageDays, bmi);
  if (!e) return null;
  return { ...e, classification: classifyBmiForAgeZ(e.z, ageDays / 30.4375) };
}

export interface CentileBand {
  p: number;
  points: { ageDays: number; value: number }[];
}

/**
 * P3–P97 reference curves for an indicator/sex across an age range, for the
 * chart to draw under the child's points. Sampled ~monthly.
 */
export function centileBands(
  indicator: Indicator,
  sex: 1 | 2,
  maxAgeDays: number,
  stepDays = 30,
): CentileBand[] {
  const top = Math.min(Math.max(maxAgeDays, 0), WHO_MAX_AGE_DAYS);
  return CENTILE_Z.map(({ p, z }) => {
    const points: { ageDays: number; value: number }[] = [];
    for (let age = 0; age <= top; age += stepDays) {
      const lms = lmsAt(indicator, sex, age);
      if (lms) points.push({ ageDays: age, value: Math.round(lmsValueAtZ(z, lms) * 100) / 100 });
    }
    return { p, points };
  });
}
