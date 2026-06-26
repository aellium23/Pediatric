import {
  evaluate,
  evaluateBmi,
  sexCode,
  centileBands,
  WHO_MAX_AGE_DAYS,
} from '../../src/common/growth/who-growth';

const p50At = (ind: any, sex: 1 | 2, ageDays: number) =>
  centileBands(ind, sex, ageDays, 1).find((b) => b.p === 50)!.points.find((p) => p.ageDays === ageDays)!
    .value;

describe('WHO growth evaluation', () => {
  it('maps free-text sex to the WHO code', () => {
    expect(sexCode('M')).toBe(1);
    expect(sexCode('masculino')).toBe(1);
    expect(sexCode('F')).toBe(2);
    expect(sexCode('feminino')).toBe(2);
    expect(sexCode('x')).toBeNull();
    expect(sexCode(undefined)).toBeNull();
  });

  it('uses the genuine WHO coefficients (boys birth median weight ≈ 3.35 kg)', () => {
    expect(p50At('wfa', 1, 0)).toBeCloseTo(3.3464, 3);
  });

  it('evaluating the median value yields ~z0 / ~P50', () => {
    const median = p50At('wfa', 1, 0);
    const e = evaluate('wfa', 1, 0, median)!;
    expect(Math.abs(e.z)).toBeLessThan(0.01);
    expect(e.percentile).toBeGreaterThan(49);
    expect(e.percentile).toBeLessThan(51);
  });

  it('places a clearly low weight well below P50 and a high one above', () => {
    const median = p50At('wfa', 1, 365);
    expect(evaluate('wfa', 1, 365, median * 0.75)!.percentile).toBeLessThan(15);
    expect(evaluate('wfa', 1, 365, median * 1.25)!.percentile).toBeGreaterThan(85);
  });

  it('classifies BMI-for-age via the WHO cutoffs', () => {
    const medianBmi = p50At('bfa', 1, 365);
    expect(evaluateBmi(1, 365, medianBmi)!.classification).toBe('eutrofia');
    // A markedly high BMI for age → overweight/obesity band.
    expect(['excesso de peso', 'obesidade', 'risco de excesso de peso']).toContain(
      evaluateBmi(1, 365, medianBmi * 1.4)!.classification,
    );
  });

  it('returns null beyond the 0–5y standard', () => {
    expect(evaluate('wfa', 1, WHO_MAX_AGE_DAYS + 1, 18)).toBeNull();
    expect(evaluate('wfa', 1, -1, 3)).toBeNull();
  });

  it('interpolates between tabulated ages without throwing', () => {
    // 100.5 days is not a tabulated row → must interpolate between days 100/101.
    const e = evaluate('lhfa', 2, 100.5, 60);
    expect(e).not.toBeNull();
    expect(Number.isFinite(e!.z)).toBe(true);
  });
});
