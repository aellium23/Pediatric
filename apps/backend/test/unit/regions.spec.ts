import { PT_REGIONS, normalizeRegion } from '../../src/common/regions';

describe('PT_REGIONS', () => {
  it('contains the 18 districts plus Açores and Madeira', () => {
    expect(PT_REGIONS).toHaveLength(20);
    expect(PT_REGIONS).toContain('Açores');
    expect(PT_REGIONS).toContain('Madeira');
    expect(PT_REGIONS).toContain('Viana do Castelo');
  });
});

describe('normalizeRegion', () => {
  const cases: Array<[string | null | undefined, string | null]> = [
    // Exact canonical names pass through.
    ['Lisboa', 'Lisboa'],
    ['Porto', 'Porto'],
    // Case-insensitive.
    ['lisboa', 'Lisboa'],
    ['PORTO', 'Porto'],
    // Accent-insensitive.
    ['evora', 'Évora'],
    ['Setubal', 'Setúbal'],
    ['braganca', 'Bragança'],
    ['santarem', 'Santarém'],
    ['acores', 'Açores'],
    // Whitespace tolerated.
    ['  Coimbra  ', 'Coimbra'],
    // Free text containing a canonical name.
    ['Funchal (Madeira)', 'Madeira'],
    ['Ponta Delgada (Açores)', 'Açores'],
    ['Angra do Heroísmo (Açores)', 'Açores'],
    ['distrito de Lisboa', 'Lisboa'],
    // Multi-word districts must win over their substrings.
    ['viana do castelo', 'Viana do Castelo'],
    ['Castelo Branco', 'Castelo Branco'],
    ['Vila Real', 'Vila Real'],
    // Aliases without the canonical name in the text.
    ['Algarve', 'Faro'],
    ['Funchal', 'Madeira'],
    ['Ponta Delgada', 'Açores'],
    ['angra do heroismo', 'Açores'],
    // Unmatched → null.
    ['Marte', null],
    ['Galiza', null],
    ['', null],
    ['   ', null],
    [null, null],
    [undefined, null],
  ];

  it.each(cases)('normalizeRegion(%p) → %p', (input, expected) => {
    expect(normalizeRegion(input)).toBe(expected);
  });

  it('is idempotent for every canonical region', () => {
    for (const region of PT_REGIONS) {
      expect(normalizeRegion(region)).toBe(region);
    }
  });
});
