/**
 * Portuguese National Vaccination Programme (PNV) reference for the vaccine
 * picker and the catch-up / due-dose calculator. `agesMonths` are the
 * scheduled administration ages (months) per the PNV; `cvx` carries the CDC
 * code where one maps cleanly (optional — several PNV entries are
 * European-specific). Verify against the current DGS schedule before clinical
 * use; schedules change.
 */
export interface VaccineItem {
  /** Short PNV abbreviation (e.g. 'VASPR'). */
  abbr: string;
  /** Full name (pt-PT). */
  name: string;
  /** Scheduled ages in months (0 = birth). */
  agesMonths: number[];
  /** CDC CVX code when mappable. */
  cvx?: string;
  /** Diseases covered. */
  covers: string;
}

export const VACCINES: VaccineItem[] = [
  { abbr: 'BCG', name: 'Vacina contra a tuberculose (grupos de risco)', agesMonths: [0], cvx: '19', covers: 'Tuberculose' },
  { abbr: 'VHB', name: 'Vacina contra a hepatite B', agesMonths: [0, 2, 6], cvx: '08', covers: 'Hepatite B' },
  { abbr: 'Hexavalente', name: 'DTPa + VIP + Hib + VHB', agesMonths: [2, 4, 6], covers: 'Difteria, tétano, tosse convulsa, poliomielite, Hib, hepatite B' },
  { abbr: 'DTPaVIPHib', name: 'DTPa + VIP + Hib (reforço)', agesMonths: [18], covers: 'Difteria, tétano, tosse convulsa, pólio, Hib' },
  { abbr: 'DTPaVIP', name: 'DTPa + VIP (reforço)', agesMonths: [60], covers: 'Difteria, tétano, tosse convulsa, poliomielite' },
  { abbr: 'Pn13', name: 'Vacina pneumocócica conjugada 13', agesMonths: [2, 4, 12], cvx: '133', covers: 'Doença pneumocócica' },
  { abbr: 'MenB', name: 'Vacina meningocócica B', agesMonths: [2, 4, 12], cvx: '163', covers: 'Meningococo B' },
  { abbr: 'MenC', name: 'Vacina meningocócica C', agesMonths: [12], covers: 'Meningococo C' },
  { abbr: 'Rotavírus', name: 'Vacina contra rotavírus (grupos de risco)', agesMonths: [2, 4], cvx: '116', covers: 'Gastroenterite por rotavírus' },
  { abbr: 'VASPR', name: 'Vacina contra sarampo, papeira e rubéola', agesMonths: [12, 60], cvx: '03', covers: 'Sarampo, papeira, rubéola' },
  { abbr: 'HPV', name: 'Vacina contra o vírus do papiloma humano', agesMonths: [120, 126], cvx: '165', covers: 'HPV (raparigas e rapazes)' },
  { abbr: 'Td', name: 'Tétano e difteria (reforço)', agesMonths: [120], covers: 'Tétano, difteria' },
  { abbr: 'Gripe', name: 'Vacina contra a gripe sazonal (grupos de risco)', agesMonths: [6], covers: 'Influenza sazonal' },
];
