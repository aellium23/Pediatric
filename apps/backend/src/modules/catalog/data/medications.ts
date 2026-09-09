/**
 * Curated ATC pediatric formulary (medication picker). `atc` is the WHO ATC
 * code; `dci` the international nonproprietary name (pt-PT). `forms` lists the
 * usual presentations to offer. `dosing`, when present, is a STANDARD textbook
 * weight-based reference for the dose calculator — the prescriber must always
 * review it; it is intentionally provided only for a few very common,
 * unambiguous drugs. Extend with the local formulary (Infarmed) as needed.
 */
export interface MedicationItem {
  atc: string;
  dci: string;
  forms: string[];
  /** Common trade names (pt-PT) to also match on. */
  brands?: string[];
  dosing?: {
    /** mg per kg per single dose. */
    mgPerKgDose?: number;
    /** mg per kg per day (alternative expression). */
    mgPerKgDay?: number;
    /** Absolute cap per dose (mg). */
    maxDoseMg?: number;
    /** Usual interval, hours. */
    everyHours?: number;
    note: string;
  };
}

export const MEDICATIONS: MedicationItem[] = [
  {
    atc: 'N02BE01', dci: 'Paracetamol', forms: ['xarope', 'supositório', 'comprimido'],
    brands: ['Ben-u-ron', 'Panadol'],
    dosing: { mgPerKgDose: 15, maxDoseMg: 1000, everyHours: 6, note: 'Antipirético: 15 mg/kg/dose 6/6h; máx 60 mg/kg/dia. Rever.' },
  },
  {
    atc: 'M01AE01', dci: 'Ibuprofeno', forms: ['suspensão oral', 'comprimido'],
    brands: ['Brufen', 'Nurofen'],
    dosing: { mgPerKgDose: 10, maxDoseMg: 600, everyHours: 8, note: '≥6 meses: 10 mg/kg/dose 8/8h; máx 30 mg/kg/dia. Rever.' },
  },
  {
    atc: 'J01CA04', dci: 'Amoxicilina', forms: ['suspensão oral', 'cápsula'],
    brands: ['Clamoxyl'],
    dosing: { mgPerKgDay: 50, everyHours: 8, note: '50 mg/kg/dia ÷ 3 (até 80–90 na OMA). Rever.' },
  },
  {
    atc: 'J01CR02', dci: 'Amoxicilina + ácido clavulânico', forms: ['suspensão oral', 'comprimido'],
    brands: ['Augmentin'],
    dosing: { mgPerKgDay: 50, everyHours: 12, note: '50 mg/kg/dia (componente amoxicilina) ÷ 2. Rever.' },
  },
  { atc: 'J01FA10', dci: 'Azitromicina', forms: ['suspensão oral'], brands: ['Zithromax'] },
  { atc: 'J01FA09', dci: 'Claritromicina', forms: ['suspensão oral'], brands: ['Klacid'] },
  { atc: 'J01CE02', dci: 'Fenoximetilpenicilina', forms: ['suspensão oral'] },
  { atc: 'J01DC02', dci: 'Cefuroxima', forms: ['suspensão oral', 'comprimido'], brands: ['Zinnat'] },
  { atc: 'J01EE01', dci: 'Sulfametoxazol + trimetoprim', forms: ['suspensão oral'], brands: ['Bactrim'] },
  { atc: 'R06AE07', dci: 'Cetirizina', forms: ['gotas', 'xarope', 'comprimido'] },
  { atc: 'R06AX27', dci: 'Desloratadina', forms: ['xarope', 'comprimido'], brands: ['Aerius'] },
  { atc: 'R06AX13', dci: 'Loratadina', forms: ['xarope', 'comprimido'] },
  { atc: 'R03AC02', dci: 'Salbutamol', forms: ['inalador pressurizado', 'solução para nebulização'], brands: ['Ventilan'] },
  { atc: 'R03BA05', dci: 'Fluticasona (inalada)', forms: ['inalador pressurizado'], brands: ['Flixotide'] },
  { atc: 'R03BB01', dci: 'Brometo de ipratrópio', forms: ['solução para nebulização'], brands: ['Atrovent'] },
  { atc: 'R01AD09', dci: 'Mometasona (nasal)', forms: ['spray nasal'], brands: ['Nasonex'] },
  { atc: 'R01AC01', dci: 'Cromoglicato de sódio (nasal)', forms: ['spray nasal'] },
  { atc: 'H02AB06', dci: 'Prednisolona', forms: ['xarope', 'comprimido'], brands: ['Lepicortinolo'] },
  { atc: 'H02AB07', dci: 'Prednisona', forms: ['comprimido'] },
  { atc: 'A07CA', dci: 'Solução de reidratação oral', forms: ['saqueta'], brands: ['Dioralyte', 'Redrate'] },
  { atc: 'A02BC01', dci: 'Omeprazol', forms: ['cápsula', 'granulado'] },
  { atc: 'A04AA01', dci: 'Ondansetrom', forms: ['comprimido orodispersível', 'xarope'], brands: ['Zofran'] },
  { atc: 'A11CC05', dci: 'Colecalciferol (vitamina D)', forms: ['gotas'], brands: ['Vigantol'] },
  { atc: 'B03AA07', dci: 'Sulfato ferroso', forms: ['gotas', 'xarope'] },
  { atc: 'P02CA01', dci: 'Mebendazol', forms: ['comprimido', 'suspensão oral'], brands: ['Pantelmin'] },
  { atc: 'P02CC01', dci: 'Pirantel', forms: ['suspensão oral'] },
  { atc: 'D01AC01', dci: 'Clotrimazol (tópico)', forms: ['creme'] },
  { atc: 'D07AB02', dci: 'Hidrocortisona (tópica)', forms: ['creme'] },
  { atc: 'D07AC01', dci: 'Betametasona (tópica)', forms: ['creme', 'pomada'] },
  { atc: 'S01AA13', dci: 'Ácido fusídico (oftálmico)', forms: ['gotas oftálmicas'] },
  { atc: 'S02AA15', dci: 'Ciprofloxacina (ótica)', forms: ['gotas óticas'] },
  { atc: 'R05CB01', dci: 'Acetilcisteína', forms: ['xarope', 'saqueta'] },
  { atc: 'A03FA01', dci: 'Metoclopramida', forms: ['solução oral'], brands: ['Primperan'] },
  { atc: 'D11AH01', dci: 'Tacrolímus (tópico)', forms: ['pomada'], brands: ['Protopic'] },
  { atc: 'A12AA04', dci: 'Carbonato de cálcio', forms: ['comprimido'] },
];
