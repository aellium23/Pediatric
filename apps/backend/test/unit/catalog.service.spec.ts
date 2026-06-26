import { CatalogService } from '../../src/modules/catalog/catalog.module';

describe('CatalogService', () => {
  const svc = new CatalogService();

  describe('searchConditions', () => {
    it('matches ICPC-2 terms accent/case-insensitively and via synonyms', () => {
      expect(svc.searchConditions('otite').some((c) => c.icpc2 === 'H71')).toBe(true);
      // "constipacao" (no cedilla/accent) must still hit R74 via synonym.
      expect(svc.searchConditions('constipacao').some((c) => c.icpc2 === 'R74')).toBe(true);
      expect(svc.searchConditions('FEBRE').some((c) => c.icpc2 === 'A03')).toBe(true);
    });

    it('returns a capped default list when the query is empty', () => {
      const all = svc.searchConditions('');
      expect(all.length).toBeGreaterThan(0);
      expect(all.length).toBeLessThanOrEqual(20);
    });
  });

  describe('searchMedications', () => {
    it('matches by DCI, brand, and ATC code', () => {
      expect(svc.searchMedications('amox').some((m) => m.atc === 'J01CA04')).toBe(true);
      expect(svc.searchMedications('ben-u-ron').some((m) => m.atc === 'N02BE01')).toBe(true);
      expect(svc.searchMedications('N02BE01').some((m) => m.dci === 'Paracetamol')).toBe(true);
    });
  });

  describe('dueVaccines', () => {
    it('returns nothing meaningful at birth beyond birth-dose vaccines', () => {
      const due = svc.dueVaccines(0);
      expect(due.every((d) => d.ageMonths === 0)).toBe(true);
    });

    it('includes the 12-month doses for a 13-month-old, sorted by age', () => {
      const due = svc.dueVaccines(13);
      expect(due.some((d) => d.abbr === 'VASPR' && d.ageMonths === 12)).toBe(true);
      const ages = due.map((d) => d.ageMonths);
      expect(ages).toEqual([...ages].sort((a, b) => a - b));
    });

    it('does not list a dose whose age has not been reached', () => {
      const due = svc.dueVaccines(3);
      // The 4-month hexavalent dose is not yet due at 3 months.
      expect(due.some((d) => d.abbr === 'Hexavalente' && d.ageMonths === 4)).toBe(false);
    });

    it('guards against invalid ages', () => {
      expect(svc.dueVaccines(-5)).toEqual([]);
      expect(svc.dueVaccines(NaN)).toEqual([]);
    });
  });

  describe('doseForWeight', () => {
    it('computes paracetamol 15 mg/kg/dose and caps at the max', () => {
      const d = svc.doseForWeight('N02BE01', 10);
      expect(d.found).toBe(true);
      expect(d.perDoseMg).toBe(150); // 15 * 10
      expect(d.verify).toBe(true);
      // A heavy child is capped at 1000 mg/dose.
      expect(svc.doseForWeight('N02BE01', 90).perDoseMg).toBe(1000);
    });

    it('computes a per-day drug (amoxicillin) into per-dose', () => {
      const d = svc.doseForWeight('J01CA04', 12); // 50 mg/kg/day ÷ 3
      expect(d.perDayMg).toBe(600);
      expect(d.perDoseMg).toBe(200);
    });

    it('returns found=false for a drug with no dosing reference', () => {
      expect(svc.doseForWeight('R06AE07', 15).found).toBe(false);
    });

    it('refuses a non-positive weight', () => {
      expect(svc.doseForWeight('N02BE01', 0).found).toBe(false);
    });
  });
});
