import {
  BANDS,
  MILESTONES,
  ageInMonths,
  currentBand,
  findMilestone,
  overdueBands,
  pendingMilestones,
} from '../../src/common/development/milestones';

/**
 * The milestone catalogue is the most clinically loaded data in the product: a
 * parent reads it alone, at night, about their own child. Two failure modes
 * matter, in this order.
 *
 * 1. Prompting a family whose child is fine. The milestones are set where ~75%
 *    of children are, so a quarter of families would see a prompt on the day
 *    their child hits the band. That is why a band only counts once the child
 *    is past the NEXT band.
 * 2. Turning a checklist into a screening test. Nothing here returns a count,
 *    a proportion or a severity — the moment it does, it is a medical device
 *    under MDR Rule 11 and the whole regulatory position changes.
 */
describe('milestone catalogue', () => {
  it('covers the bands from 2 months to 5 years, in order', () => {
    expect(BANDS).toEqual([2, 4, 6, 9, 12, 15, 18, 24, 30, 36, 48, 60]);
  });

  it('gives every band all four developmental domains', () => {
    for (const b of BANDS) {
      const domains = new Set(MILESTONES.filter((m) => m.months === b).map((m) => m.domain));
      expect([...domains].sort()).toEqual(['cognitivo', 'linguagem', 'motor', 'social']);
    }
  });

  // The code is what gets written into a child's record. Renumbering one would
  // silently re-point every existing row at a different milestone.
  it('has a unique, stable, non-empty code and wording for every item', () => {
    const codes = MILESTONES.map((m) => m.code);
    expect(new Set(codes).size).toBe(codes.length);
    for (const m of MILESTONES) {
      expect(m.code).toMatch(/^m\d+-(social|linguagem|cognitivo|motor)-\d+$/);
      expect(m.code.startsWith(`m${m.months}-`)).toBe(true);
      // "Corre" is a real milestone and is five characters long.
      expect(m.pt.trim().length).toBeGreaterThanOrEqual(5);
    }
  });

  it('finds an item by code and refuses one that is not in the catalogue', () => {
    expect(findMilestone(MILESTONES[0].code)).toEqual(MILESTONES[0]);
    expect(findMilestone('m2-social-999')).toBeUndefined();
    expect(findMilestone('')).toBeUndefined();
  });
});

describe('ageInMonths', () => {
  it('counts whole months completed, not started', () => {
    expect(ageInMonths('2026-01-15', '2026-04-14')).toBe(2);
    expect(ageInMonths('2026-01-15', '2026-04-15')).toBe(3);
    expect(ageInMonths('2026-01-15', '2027-01-15')).toBe(12);
  });

  it('never goes negative for a date before birth or an unreadable one', () => {
    expect(ageInMonths('2026-06-01', '2026-01-01')).toBe(0);
    expect(ageInMonths('não é uma data')).toBe(0);
  });
});

describe('currentBand', () => {
  it('is the highest band already reached', () => {
    expect(currentBand(0)).toBeNull();
    expect(currentBand(1)).toBeNull();
    expect(currentBand(2)).toBe(2);
    expect(currentBand(3)).toBe(2);
    expect(currentBand(23)).toBe(18);
    expect(currentBand(24)).toBe(24);
  });

  // The catalogue covers 0–5y, like the WHO growth curves. An older child
  // keeps the last band rather than falling off the end into null.
  it('stays on the last band for a child past five', () => {
    expect(currentBand(60)).toBe(60);
    expect(currentBand(96)).toBe(60);
  });
});

describe('overdueBands — the grace period', () => {
  // The whole point: reaching a band is not being late for it.
  it('does not count the band the child has only just reached', () => {
    expect(overdueBands(12)).not.toContain(12);
    expect(overdueBands(14)).not.toContain(12);
  });

  it('counts a band once the child is past the next one', () => {
    expect(overdueBands(15)).toContain(12);
    expect(overdueBands(18)).toContain(15);
  });

  it('has nothing overdue for a newborn', () => {
    expect(overdueBands(0)).toEqual([]);
    expect(overdueBands(3)).toEqual([]);
  });

  // The last band has no band after it, so it can never become overdue —
  // otherwise a five-year-old would be prompted forever on the 5-year items.
  it('never marks the final band overdue', () => {
    expect(overdueBands(120)).not.toContain(60);
    expect(overdueBands(120)).toEqual([2, 4, 6, 9, 12, 15, 18, 24, 30, 36, 48]);
  });
});

describe('pendingMilestones', () => {
  it('returns the unticked items from bands the child is past', () => {
    const pending = pendingMilestones(6, []);
    expect(pending.every((m) => m.months <= 4)).toBe(true);
    expect(pending.some((m) => m.months === 2)).toBe(true);
    expect(pending.some((m) => m.months === 6)).toBe(false);
  });

  it('drops what the family has ticked', () => {
    const two = MILESTONES.filter((m) => m.months === 2);
    const pending = pendingMilestones(6, two.map((m) => m.code));
    expect(pending.some((m) => m.months === 2)).toBe(false);
    expect(pending.some((m) => m.months === 4)).toBe(true);
  });

  it('is empty when everything due has been ticked', () => {
    const due = MILESTONES.filter((m) => m.months <= 4).map((m) => m.code);
    expect(pendingMilestones(6, due)).toEqual([]);
  });

  it('is empty for a baby too young for any band to be overdue', () => {
    expect(pendingMilestones(1, [])).toEqual([]);
    expect(pendingMilestones(3, [])).toEqual([]);
  });

  it('ignores ticks for codes outside the overdue bands', () => {
    const later = MILESTONES.filter((m) => m.months === 24).map((m) => m.code);
    expect(pendingMilestones(6, later).length).toBe(
      MILESTONES.filter((m) => m.months <= 4).length,
    );
  });

  // The regulatory line, asserted as a test rather than left to a comment: the
  // output is a list of checklist items, with no result attached to it.
  it('returns catalogue items and nothing that could be read as a result', () => {
    const pending = pendingMilestones(24, []);
    expect(pending.length).toBeGreaterThan(0);
    for (const item of pending) {
      expect(Object.keys(item).sort()).toEqual(['code', 'domain', 'months', 'pt']);
    }
  });
});
