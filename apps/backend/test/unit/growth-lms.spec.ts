import {
  CENTILE_Z,
  classifyBmiForAgeZ,
  interpolateLms,
  lmsValueAtZ,
  lmsZScore,
  normalCdf,
  zToPercentile,
} from '../../src/common/growth/lms';

describe('growth LMS engine', () => {
  describe('lmsZScore / lmsValueAtZ', () => {
    it('returns z=0 at the median M', () => {
      expect(lmsZScore(16, { L: 1, M: 16, S: 0.1 })).toBeCloseTo(0, 10);
      // L = 0 branch (lognormal)
      expect(lmsZScore(16, { L: 0, M: 16, S: 0.1 })).toBeCloseTo(0, 10);
    });

    it('round-trips value <-> z for L != 0 and L = 0', () => {
      const lms = { L: -0.3, M: 17, S: 0.08 };
      const v = lmsValueAtZ(1.3, lms);
      expect(lmsZScore(v, lms)).toBeCloseTo(1.3, 8);

      const ln = { L: 0, M: 9, S: 0.12 };
      const v0 = lmsValueAtZ(-0.7, ln);
      expect(lmsZScore(v0, ln)).toBeCloseTo(-0.7, 8);
    });

    it('rejects non-physical inputs with NaN', () => {
      expect(lmsZScore(0, { L: 1, M: 16, S: 0.1 })).toBeNaN();
      expect(lmsZScore(10, { L: 1, M: 0, S: 0.1 })).toBeNaN();
    });
  });

  describe('normalCdf / zToPercentile', () => {
    it('matches well-known normal probabilities', () => {
      expect(normalCdf(0)).toBeCloseTo(0.5, 6);
      expect(normalCdf(1)).toBeCloseTo(0.8413447, 5);
      expect(normalCdf(-1)).toBeCloseTo(0.1586553, 5);
      expect(normalCdf(1.959964)).toBeCloseTo(0.975, 4);
    });

    it('maps the standard centile z-scores back to their percentiles', () => {
      expect(zToPercentile(0)).toBe(50);
      expect(zToPercentile(CENTILE_Z.find((c) => c.p === 97)!.z)).toBeCloseTo(97, 0);
      expect(zToPercentile(CENTILE_Z.find((c) => c.p === 3)!.z)).toBeCloseTo(3, 0);
      expect(zToPercentile(CENTILE_Z.find((c) => c.p === 85)!.z)).toBeCloseTo(85, 0);
    });
  });

  describe('classifyBmiForAgeZ (WHO cutoffs)', () => {
    it('applies the <5y thresholds (WHO 2006)', () => {
      expect(classifyBmiForAgeZ(0, 24)).toBe('eutrofia');
      expect(classifyBmiForAgeZ(1.5, 24)).toBe('risco de excesso de peso');
      expect(classifyBmiForAgeZ(2.5, 24)).toBe('excesso de peso');
      expect(classifyBmiForAgeZ(3.5, 24)).toBe('obesidade');
      expect(classifyBmiForAgeZ(-2.5, 24)).toBe('magreza');
      expect(classifyBmiForAgeZ(-3.5, 24)).toBe('magreza acentuada');
    });

    it('applies the 5-19y thresholds (WHO 2007)', () => {
      expect(classifyBmiForAgeZ(1.5, 120)).toBe('excesso de peso');
      expect(classifyBmiForAgeZ(2.5, 120)).toBe('obesidade');
      expect(classifyBmiForAgeZ(0.5, 120)).toBe('eutrofia');
    });
  });

  describe('interpolateLms', () => {
    it('linearly interpolates coefficients between tabulated ages', () => {
      const a = { age: 24, L: -1, M: 12, S: 0.08 };
      const b = { age: 25, L: -1.2, M: 12.4, S: 0.082 };
      const mid = interpolateLms(24.5, a, b);
      expect(mid.L).toBeCloseTo(-1.1, 10);
      expect(mid.M).toBeCloseTo(12.2, 10);
      expect(mid.S).toBeCloseTo(0.081, 10);
    });

    it('is exact at the lower bound', () => {
      const a = { age: 24, L: -1, M: 12, S: 0.08 };
      const b = { age: 25, L: -1.2, M: 12.4, S: 0.082 };
      expect(interpolateLms(24, a, b)).toEqual({ L: -1, M: 12, S: 0.08 });
    });
  });
});
