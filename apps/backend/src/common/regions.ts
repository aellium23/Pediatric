/**
 * Canonical Portuguese regions used for market analytics granularity:
 * the 18 continental districts plus the two autonomous regions.
 * Family.region and Pediatrician.region free text are normalized against
 * this list so supply/demand can be compared on the same axis.
 */
export const PT_REGIONS = [
  'Aveiro',
  'Beja',
  'Braga',
  'Bragança',
  'Castelo Branco',
  'Coimbra',
  'Évora',
  'Faro',
  'Guarda',
  'Leiria',
  'Lisboa',
  'Portalegre',
  'Porto',
  'Santarém',
  'Setúbal',
  'Viana do Castelo',
  'Vila Real',
  'Viseu',
  'Açores',
  'Madeira',
] as const;

export type PtRegion = (typeof PT_REGIONS)[number];

/** Case/accent-insensitive canonical form ("Évora" → "evora"). */
function fold(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

// Common free-text spellings that don't literally contain a canonical region
// name (island capitals, tourist-region names, …) → canonical bucket.
const ALIASES: ReadonlyArray<[alias: string, canonical: PtRegion]> = [
  ['algarve', 'Faro'],
  ['funchal', 'Madeira'],
  ['porto santo', 'Madeira'],
  ['ponta delgada', 'Açores'],
  ['angra do heroismo', 'Açores'],
  ['horta', 'Açores'],
  ['sao miguel', 'Açores'],
  ['terceira', 'Açores'],
];

// Longest-first so "Viana do Castelo" wins over "Castelo Branco"/"Braga" etc.
const CANONICAL_BY_LENGTH = [...PT_REGIONS].sort((a, b) => b.length - a.length);

/**
 * Maps free-text region input to a canonical PT_REGIONS entry.
 * Matching is case/accent-insensitive; strings that merely contain a region
 * name (e.g. "Funchal (Madeira)", "distrito de Lisboa") also match.
 * Unmatched input yields null — callers decide the fallback bucket.
 */
export function normalizeRegion(input: string | null | undefined): string | null {
  if (!input) return null;
  const folded = fold(input);
  if (!folded) return null;

  for (const region of PT_REGIONS) {
    if (fold(region) === folded) return region;
  }
  for (const region of CANONICAL_BY_LENGTH) {
    if (folded.includes(fold(region))) return region;
  }
  for (const [alias, canonical] of ALIASES) {
    if (folded.includes(alias)) return canonical;
  }
  return null;
}
