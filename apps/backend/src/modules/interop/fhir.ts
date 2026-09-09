/**
 * FHIR R4 mapping for a child's record.
 *
 * WHY THIS EXISTS: the EHDS applies from 26 March 2027 and the first wave of
 * data exchange lands in March 2029, on the European EEHRxF format. Building
 * the export now, while the database holds pilot data, costs days; building it
 * after real families have years of history is a migration project.
 *
 * WHAT THIS IS: a faithful, *lossy-by-omission-never-by-invention* projection
 * of what we store onto FHIR R4 resources. Every function here is pure — it
 * takes plain rows and returns plain objects — so the mapping can be tested
 * exhaustively without a database.
 *
 * WHAT THIS IS NOT: a claim of conformance to any profile (not IPS, not
 * EEHRxF, not a national one), and not a terminology service. The rule the
 * whole file obeys: **a code is emitted only when we actually hold that code**.
 * Where we hold free text — an allergy a parent typed, a vaccine name off a
 * paper booklet — it goes out as `text` with no `coding`. Guessing a SNOMED or
 * ATC code from Portuguese free text would produce an export that looks
 * interoperable and is wrong, which is worse than one that is visibly partial.
 *
 * See `docs/compliance/02-exportacao-fhir.md` for what a receiving system can
 * and cannot rely on.
 */

// ── Code systems ─────────────────────────────────────
export const SYS = {
  loinc: 'http://loinc.org',
  ucum: 'http://unitsofmeasure.org',
  cvx: 'http://hl7.org/fhir/sid/cvx',
  atc: 'http://www.whocc.no/atc',
  icd10: 'http://hl7.org/fhir/sid/icd-10',
  icpc2: 'http://hl7.org/fhir/sid/icpc-2',
  obsCategory: 'http://terminology.hl7.org/CodeSystem/observation-category',
  allergyClinical: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical',
  conditionClinical: 'http://terminology.hl7.org/CodeSystem/condition-clinical',
  // Local namespaces. These are OURS — they are not registered naming systems,
  // and a receiver must treat them as opaque. Before any real cross-border
  // exchange the SNS identifier needs the official Portuguese naming system
  // and the allergen catalogue needs mapping to SNOMED CT.
  snsUtente: 'urn:pedia:sns-utente',
  allergen: 'urn:pedia:allergen',
  milestone: 'urn:pedia:milestone',
} as const;

/** A LOINC concept plus the UCUM unit its value is recorded in. */
interface Loinc {
  code: string;
  display: string;
  unit: string;
  ucum: string;
}

// LOINC codes for the things we measure. Each one is a deliberate choice, not
// a lookup: these are our own numeric fields, so we know exactly what they
// mean and the mapping is ours to assert.
const LOINC: Record<string, Loinc> = {
  weight: { code: '29463-7', display: 'Body weight', unit: 'kg', ucum: 'kg' },
  height: { code: '8302-2', display: 'Body height', unit: 'cm', ucum: 'cm' },
  head: { code: '9843-4', display: 'Head Occipital-frontal circumference', unit: 'cm', ucum: 'cm' },
  temperature: { code: '8310-5', display: 'Body temperature', unit: 'Cel', ucum: 'Cel' },
  heartRate: { code: '8867-4', display: 'Heart rate', unit: '/min', ucum: '/min' },
  respRate: { code: '9279-1', display: 'Respiratory rate', unit: '/min', ucum: '/min' },
  spo2: {
    code: '59408-5',
    display: 'Oxygen saturation in Arterial blood by Pulse oximetry',
    unit: '%',
    ucum: '%',
  },
  systolic: { code: '8480-6', display: 'Systolic blood pressure', unit: 'mmHg', ucum: 'mm[Hg]' },
  diastolic: { code: '8462-4', display: 'Diastolic blood pressure', unit: 'mmHg', ucum: 'mm[Hg]' },
};

/** The panel carries no value of its own — the two components do. */
const BP_PANEL = { code: '85354-9', display: 'Blood pressure panel with all children optional' };

// ── Shapes we take in (already decrypted by the caller) ──
export interface ChildIn {
  id: string;
  name: string;
  birthDate: Date | string;
  sex?: string | null;
  snsNumber?: string | null;
}
export interface GrowthIn {
  id: string;
  measuredAt: Date | string;
  heightCm?: number | null;
  weightKg?: number | null;
  headCm?: number | null;
}
export interface VitalIn {
  id: string;
  measuredAt: Date | string;
  temperatureC?: number | null;
  heartRateBpm?: number | null;
  respRateBpm?: number | null;
  spo2Pct?: number | null;
  systolicMmHg?: number | null;
  diastolicMmHg?: number | null;
}
export interface AllergyIn {
  id: string;
  label: string;
  code?: string | null;
  category?: string | null;
  createdAt?: Date | string | null;
}
export interface VaccineIn {
  id: string;
  name: string;
  date: Date | string;
  notes?: string | null;
  cvx?: string | null;
  pnvAbbr?: string | null;
}
export interface MedicationIn {
  id: string;
  name: string;
  dose?: string | null;
  atcCode?: string | null;
  route?: string | null;
  frequency?: string | null;
  active: boolean;
  startedAt?: Date | string | null;
}
export interface EpisodeIn {
  id: string;
  title: string;
  summary?: string | null;
  icpc2Code?: string | null;
  icd10Code?: string | null;
  status: string;
  createdAt?: Date | string | null;
  closedAt?: Date | string | null;
}
export interface DocumentIn {
  id: string;
  title: string;
  kind: string;
  mime: string;
  sizeBytes: number;
  issuedAt?: Date | string | null;
  createdAt: Date | string;
}

export interface MilestoneIn {
  id: string;
  code: string;
  label: string;
  achievedAt: Date | string;
  note?: string | null;
}

export interface RecordIn {
  child: ChildIn;
  growth?: GrowthIn[];
  vitals?: VitalIn[];
  allergies?: AllergyIn[];
  vaccines?: VaccineIn[];
  medications?: MedicationIn[];
  episodes?: EpisodeIn[];
  documents?: DocumentIn[];
  milestones?: MilestoneIn[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = Record<string, any>;
export interface FhirBundle {
  resourceType: 'Bundle';
  type: 'collection';
  timestamp: string;
  entry: { fullUrl: string; resource: Json }[];
}

// ── Small helpers ────────────────────────────────────
const ref = (id: string) => ({ reference: `urn:uuid:${id}` });

/** FHIR `instant`/`dateTime`: an ISO-8601 point in time, or undefined. */
function instant(v: Date | string | null | undefined): string | undefined {
  if (!v) return undefined;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

/** FHIR `date`: YYYY-MM-DD, which is what birthDate and vaccination dates are. */
function ymd(v: Date | string | null | undefined): string | undefined {
  const iso = instant(v);
  return iso?.slice(0, 10);
}

const text = (v: string | null | undefined): string | undefined => {
  const s = typeof v === 'string' ? v.trim() : '';
  return s ? s : undefined;
};

/** Drops undefined keys so the JSON has no `"x": undefined` shaped holes. */
function compact<T extends Json>(obj: T): T {
  for (const k of Object.keys(obj)) if (obj[k] === undefined) delete obj[k];
  return obj;
}

function quantity(value: number, unit: string, ucum: string) {
  return { value, unit, system: SYS.ucum, code: ucum };
}

const VITAL_SIGNS_CATEGORY = [
  { coding: [{ system: SYS.obsCategory, code: 'vital-signs', display: 'Vital Signs' }] },
];

function observation(args: {
  id: string;
  patientId: string;
  loinc: { code: string; display: string };
  effective?: string;
  value?: { value: number; unit: string; system: string; code: string };
  components?: Json[];
}): Json {
  return compact({
    resourceType: 'Observation',
    id: args.id,
    status: 'final',
    category: VITAL_SIGNS_CATEGORY,
    code: {
      coding: [{ system: SYS.loinc, code: args.loinc.code, display: args.loinc.display }],
      text: args.loinc.display,
    },
    subject: ref(args.patientId),
    effectiveDateTime: args.effective,
    valueQuantity: args.value,
    component: args.components,
  });
}

// ── Resource mappers ─────────────────────────────────

/**
 * FHIR `gender` is administrative gender, and we only hold a birth-registered
 * sex used for the WHO growth curves. Mapping it across is the least-wrong
 * option for a paediatric record; an unrecognised value becomes `other` rather
 * than being silently dropped or guessed, and an absent one `unknown`.
 */
export function fhirGender(sex?: string | null): 'male' | 'female' | 'other' | 'unknown' {
  const s = (sex ?? '').trim().toLowerCase();
  if (!s) return 'unknown';
  if (s.startsWith('m')) return 'male';
  if (s.startsWith('f')) return 'female';
  return 'other';
}

export function toPatient(child: ChildIn): Json {
  const name = text(child.name);
  const sns = text(child.snsNumber);
  return compact({
    resourceType: 'Patient',
    id: child.id,
    identifier: sns ? [{ system: SYS.snsUtente, value: sns }] : undefined,
    name: name ? [{ use: 'official', text: name }] : undefined,
    gender: fhirGender(child.sex),
    birthDate: ymd(child.birthDate),
  });
}

/** One growth row is up to three Observations — FHIR has no "growth" resource. */
export function toGrowthObservations(g: GrowthIn, patientId: string): Json[] {
  const effective = instant(g.measuredAt);
  const out: Json[] = [];
  const add = (suffix: string, loinc: Loinc, value?: number | null) => {
    if (typeof value !== 'number' || !Number.isFinite(value)) return;
    out.push(
      observation({
        id: `${g.id}-${suffix}`,
        patientId,
        loinc,
        effective,
        value: quantity(value, loinc.unit, loinc.ucum),
      }),
    );
  };
  add('weight', LOINC.weight, g.weightKg);
  add('height', LOINC.height, g.heightCm);
  add('head', LOINC.head, g.headCm);
  return out;
}

/**
 * Blood pressure is one Observation with two components, not two Observations
 * — that is the R4 pattern, and a receiver that splits them loses the pairing.
 */
export function toVitalObservations(v: VitalIn, patientId: string): Json[] {
  const effective = instant(v.measuredAt);
  const out: Json[] = [];
  const add = (suffix: string, loinc: Loinc, value?: number | null) => {
    if (typeof value !== 'number' || !Number.isFinite(value)) return;
    out.push(
      observation({
        id: `${v.id}-${suffix}`,
        patientId,
        loinc,
        effective,
        value: quantity(value, loinc.unit, loinc.ucum),
      }),
    );
  };
  add('temp', LOINC.temperature, v.temperatureC);
  add('hr', LOINC.heartRate, v.heartRateBpm);
  add('rr', LOINC.respRate, v.respRateBpm);
  add('spo2', LOINC.spo2, v.spo2Pct);

  const sys = typeof v.systolicMmHg === 'number' ? v.systolicMmHg : null;
  const dia = typeof v.diastolicMmHg === 'number' ? v.diastolicMmHg : null;
  if (sys !== null || dia !== null) {
    const component: Json[] = [];
    if (sys !== null)
      component.push({
        code: { coding: [{ system: SYS.loinc, code: LOINC.systolic.code, display: LOINC.systolic.display }] },
        valueQuantity: quantity(sys, LOINC.systolic.unit, LOINC.systolic.ucum),
      });
    if (dia !== null)
      component.push({
        code: { coding: [{ system: SYS.loinc, code: LOINC.diastolic.code, display: LOINC.diastolic.display }] },
        valueQuantity: quantity(dia, LOINC.diastolic.unit, LOINC.diastolic.ucum),
      });
    out.push(
      observation({ id: `${v.id}-bp`, patientId, loinc: BP_PANEL, effective, components: component }),
    );
  }
  return out;
}

/** farmaco/alimento/ambiental → the FHIR value set. Unknown ⇒ no category. */
export function allergyCategory(
  category?: string | null,
): 'medication' | 'food' | 'environment' | undefined {
  const c = (category ?? '').trim().toLowerCase();
  if (c.startsWith('farmac') || c.startsWith('fármac') || c === 'medication') return 'medication';
  if (c.startsWith('aliment') || c === 'food') return 'food';
  if (c.startsWith('ambient') || c === 'environment') return 'environment';
  return undefined;
}

export function toAllergyIntolerance(a: AllergyIn, patientId: string): Json {
  const code = text(a.code);
  const cat = allergyCategory(a.category);
  return compact({
    resourceType: 'AllergyIntolerance',
    id: a.id,
    clinicalStatus: { coding: [{ system: SYS.allergyClinical, code: 'active', display: 'Active' }] },
    category: cat ? [cat] : undefined,
    code: compact({
      coding: code ? [{ system: SYS.allergen, code }] : undefined,
      text: text(a.label),
    }),
    patient: ref(patientId),
    recordedDate: instant(a.createdAt),
  });
}

export function toImmunization(v: VaccineIn, patientId: string): Json {
  const cvx = text(v.cvx);
  const pnv = text(v.pnvAbbr);
  const notes = text(v.notes);
  // The PNV abbreviation is a national schedule label, not a vaccine code, so
  // it travels as a note rather than pretending to be a coding.
  const noteLines = [notes, pnv ? `PNV: ${pnv}` : undefined].filter(Boolean) as string[];
  return compact({
    resourceType: 'Immunization',
    id: v.id,
    status: 'completed',
    vaccineCode: compact({
      coding: cvx ? [{ system: SYS.cvx, code: cvx }] : undefined,
      text: text(v.name),
    }),
    patient: ref(patientId),
    occurrenceDateTime: ymd(v.date),
    note: noteLines.length ? noteLines.map((t) => ({ text: t })) : undefined,
  });
}

export function toMedicationStatement(m: MedicationIn, patientId: string): Json {
  const atc = text(m.atcCode);
  const dosageText = [text(m.dose), text(m.frequency)].filter(Boolean).join(' · ');
  const route = text(m.route);
  const dosage = dosageText || route ? [compact({ text: dosageText || undefined, route: route ? { text: route } : undefined })] : undefined;
  return compact({
    resourceType: 'MedicationStatement',
    id: m.id,
    status: m.active ? 'active' : 'completed',
    medicationCodeableConcept: compact({
      coding: atc ? [{ system: SYS.atc, code: atc }] : undefined,
      text: text(m.name),
    }),
    subject: ref(patientId),
    effectiveDateTime: instant(m.startedAt),
    dosage,
  });
}

export function toCondition(e: EpisodeIn, patientId: string): Json {
  const coding: Json[] = [];
  const icd10 = text(e.icd10Code);
  const icpc2 = text(e.icpc2Code);
  if (icd10) coding.push({ system: SYS.icd10, code: icd10 });
  if (icpc2) coding.push({ system: SYS.icpc2, code: icpc2 });
  const closed = instant(e.closedAt);
  const resolved = !!closed || (e.status ?? '').trim().toUpperCase() === 'CLOSED';
  return compact({
    resourceType: 'Condition',
    id: e.id,
    clinicalStatus: {
      coding: [
        resolved
          ? { system: SYS.conditionClinical, code: 'resolved', display: 'Resolved' }
          : { system: SYS.conditionClinical, code: 'active', display: 'Active' },
      ],
    },
    code: compact({ coding: coding.length ? coding : undefined, text: text(e.title) }),
    subject: ref(patientId),
    recordedDate: instant(e.createdAt),
    abatementDateTime: closed,
    note: text(e.summary) ? [{ text: text(e.summary) }] : undefined,
  });
}

/**
 * The vault file itself is NOT inlined. A record with a few PDFs would become
 * a multi-megabyte JSON that no importer handles gracefully, and the bytes are
 * one authenticated request away. The reference carries everything needed to
 * fetch it: type, size and the URL of the document endpoint.
 */
export function toDocumentReference(d: DocumentIn, patientId: string, apiBase = ''): Json {
  return compact({
    resourceType: 'DocumentReference',
    id: d.id,
    status: 'current',
    type: { text: text(d.kind) },
    subject: ref(patientId),
    date: instant(d.createdAt),
    content: [
      {
        attachment: compact({
          contentType: text(d.mime),
          url: `${apiBase}/documents/${patientId}/${d.id}`,
          title: text(d.title),
          size: Number.isFinite(d.sizeBytes) ? d.sizeBytes : undefined,
          creation: instant(d.issuedAt),
        }),
      },
    ],
  });
}

/**
 * A milestone the family observed, as an `Observation` — FHIR has no
 * developmental-milestone resource, and an Observation with a date and a
 * "yes" is exactly what this is.
 *
 * The category is `survey`, not `vital-signs`: the value came from a parent
 * answering a published checklist, not from a measurement. No LOINC is
 * asserted — the CDC milestones have no code we hold — so the catalogue key
 * travels in our own opaque namespace and the wording as `text`. Absence of an
 * Observation means the box was not ticked, which is NOT the same as the child
 * not doing it; nothing downstream may read it as a negative finding.
 */
export function toMilestoneObservation(m: MilestoneIn, patientId: string): Json {
  return compact({
    resourceType: 'Observation',
    id: m.id,
    status: 'final',
    category: [
      { coding: [{ system: SYS.obsCategory, code: 'survey', display: 'Survey' }] },
    ],
    code: compact({
      coding: [{ system: SYS.milestone, code: m.code }],
      text: text(m.label),
    }),
    subject: ref(patientId),
    effectiveDateTime: instant(m.achievedAt),
    valueBoolean: true,
    note: text(m.note) ? [{ text: text(m.note) }] : undefined,
  });
}

/** The whole record as one FHIR R4 `collection` Bundle. */
export function toBundle(rec: RecordIn, opts: { apiBase?: string; now?: Date } = {}): FhirBundle {
  const patientId = rec.child.id;
  const resources: Json[] = [toPatient(rec.child)];

  for (const g of rec.growth ?? []) resources.push(...toGrowthObservations(g, patientId));
  for (const v of rec.vitals ?? []) resources.push(...toVitalObservations(v, patientId));
  for (const a of rec.allergies ?? []) resources.push(toAllergyIntolerance(a, patientId));
  for (const v of rec.vaccines ?? []) resources.push(toImmunization(v, patientId));
  for (const m of rec.medications ?? []) resources.push(toMedicationStatement(m, patientId));
  for (const e of rec.episodes ?? []) resources.push(toCondition(e, patientId));
  for (const m of rec.milestones ?? []) resources.push(toMilestoneObservation(m, patientId));
  for (const d of rec.documents ?? []) resources.push(toDocumentReference(d, patientId, opts.apiBase));

  return {
    resourceType: 'Bundle',
    type: 'collection',
    timestamp: (opts.now ?? new Date()).toISOString(),
    // In a collection Bundle without a server base, references resolve by
    // fullUrl. urn:uuid is the form the spec gives for exactly this case.
    entry: resources.map((resource) => ({
      fullUrl: `urn:uuid:${resource.id as string}`,
      resource,
    })),
  };
}
