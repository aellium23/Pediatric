import {
  SYS,
  allergyCategory,
  fhirGender,
  toAllergyIntolerance,
  toBundle,
  toCondition,
  toDocumentReference,
  toGrowthObservations,
  toImmunization,
  toMedicationStatement,
  toPatient,
  toVitalObservations,
} from '../../src/modules/interop/fhir';

const PATIENT = 'child-1';

/**
 * The export is the one thing another system reads without us in the room, so
 * these tests are written from the receiver's side: given our rows, what
 * exactly lands in the JSON, and — the half that matters more — what does NOT.
 *
 * The rule under test throughout: a code is emitted only when we hold that
 * code. An export that looks coded and is guessed is worse than one that is
 * visibly partial, because a receiving system trusts the coding and not the
 * text.
 */
describe('FHIR export — Patient', () => {
  it('carries name, birth date and gender', () => {
    const p = toPatient({ id: PATIENT, name: 'Rita Alves', birthDate: '2023-02-10', sex: 'F' });
    expect(p.resourceType).toBe('Patient');
    expect(p.id).toBe(PATIENT);
    expect(p.name).toEqual([{ use: 'official', text: 'Rita Alves' }]);
    expect(p.birthDate).toBe('2023-02-10');
    expect(p.gender).toBe('female');
  });

  it('includes the SNS number as an identifier when there is one', () => {
    const p = toPatient({ id: PATIENT, name: 'R', birthDate: '2023-02-10', snsNumber: '123456789' });
    expect(p.identifier).toEqual([{ system: SYS.snsUtente, value: '123456789' }]);
  });

  it('omits the identifier entirely rather than emitting an empty one', () => {
    for (const sns of [null, undefined, '', '   ']) {
      const p = toPatient({ id: PATIENT, name: 'R', birthDate: '2023-02-10', snsNumber: sns });
      expect('identifier' in p).toBe(false);
    }
  });

  // FHIR gender is administrative; ours is the birth sex the growth curves
  // need. Mapping it is the least-wrong option, and an unrecognised value must
  // not silently become "male".
  it('maps sex to a FHIR gender without guessing', () => {
    expect(fhirGender('M')).toBe('male');
    expect(fhirGender('masculino')).toBe('male');
    expect(fhirGender('F')).toBe('female');
    expect(fhirGender('feminino')).toBe('female');
    expect(fhirGender('')).toBe('unknown');
    expect(fhirGender(null)).toBe('unknown');
    expect(fhirGender(undefined)).toBe('unknown');
    expect(fhirGender('outro')).toBe('other');
  });
});

describe('FHIR export — growth', () => {
  const row = { id: 'g1', measuredAt: '2026-05-04T10:00:00.000Z', weightKg: 12.4, heightCm: 86, headCm: 47 };

  it('splits one measurement row into one Observation per value', () => {
    const obs = toGrowthObservations(row, PATIENT);
    expect(obs.map((o) => o.code.coding[0].code)).toEqual(['29463-7', '8302-2', '9843-4']);
    expect(obs.every((o) => o.status === 'final')).toBe(true);
    expect(obs.every((o) => o.subject.reference === `urn:uuid:${PATIENT}`)).toBe(true);
    expect(obs.every((o) => o.effectiveDateTime === '2026-05-04T10:00:00.000Z')).toBe(true);
  });

  it('states the unit in UCUM, not just as a display string', () => {
    const [weight] = toGrowthObservations(row, PATIENT);
    expect(weight.valueQuantity).toEqual({
      value: 12.4,
      unit: 'kg',
      system: SYS.ucum,
      code: 'kg',
    });
  });

  it('emits nothing for values that were never recorded', () => {
    const obs = toGrowthObservations(
      { id: 'g2', measuredAt: '2026-05-04T10:00:00.000Z', weightKg: 12.4 },
      PATIENT,
    );
    expect(obs).toHaveLength(1);
  });

  // A zero is a real (if odd) measurement; null and NaN are not.
  it('keeps a zero and drops what is not a finite number', () => {
    const obs = toGrowthObservations(
      { id: 'g3', measuredAt: '2026-05-04T10:00:00.000Z', weightKg: 0, heightCm: NaN, headCm: null },
      PATIENT,
    );
    expect(obs).toHaveLength(1);
    expect(obs[0].valueQuantity.value).toBe(0);
  });
});

describe('FHIR export — vitals', () => {
  it('codes each vital sign and categorises it as such', () => {
    const obs = toVitalObservations(
      {
        id: 'v1',
        measuredAt: '2026-05-04T10:00:00.000Z',
        temperatureC: 38.5,
        heartRateBpm: 120,
        respRateBpm: 28,
        spo2Pct: 97,
      },
      PATIENT,
    );
    expect(obs.map((o) => o.code.coding[0].code)).toEqual(['8310-5', '8867-4', '9279-1', '59408-5']);
    expect(obs.every((o) => o.category[0].coding[0].code === 'vital-signs')).toBe(true);
  });

  // Splitting systolic and diastolic into two Observations loses the pairing.
  // R4 says one panel with two components, and that is what a receiver expects.
  it('emits blood pressure as one panel with two components', () => {
    const obs = toVitalObservations(
      { id: 'v2', measuredAt: '2026-05-04T10:00:00.000Z', systolicMmHg: 95, diastolicMmHg: 60 },
      PATIENT,
    );
    expect(obs).toHaveLength(1);
    const bp = obs[0];
    expect(bp.code.coding[0].code).toBe('85354-9');
    expect(bp.valueQuantity).toBeUndefined();
    expect(bp.component.map((c: { code: { coding: { code: string }[] } }) => c.code.coding[0].code)).toEqual([
      '8480-6',
      '8462-4',
    ]);
    expect(bp.component[0].valueQuantity).toEqual({
      value: 95,
      unit: 'mmHg',
      system: SYS.ucum,
      code: 'mm[Hg]',
    });
  });

  it('emits no blood-pressure panel when neither number was taken', () => {
    const obs = toVitalObservations(
      { id: 'v3', measuredAt: '2026-05-04T10:00:00.000Z', temperatureC: 37 },
      PATIENT,
    );
    expect(obs.some((o) => o.code.coding[0].code === '85354-9')).toBe(false);
  });
});

describe('FHIR export — allergies', () => {
  it('carries the label as text and the catalogue code as a coding', () => {
    const a = toAllergyIntolerance(
      { id: 'a1', label: 'Amendoim', code: 'PEANUT', category: 'alimento' },
      PATIENT,
    );
    expect(a.resourceType).toBe('AllergyIntolerance');
    expect(a.code.text).toBe('Amendoim');
    expect(a.code.coding).toEqual([{ system: SYS.allergen, code: 'PEANUT' }]);
    expect(a.category).toEqual(['food']);
    expect(a.clinicalStatus.coding[0].code).toBe('active');
  });

  // THE point of the whole file: free text goes out as text, never as an
  // invented SNOMED code that a receiving system would then trust.
  it('emits no coding at all for an allergy that was only ever typed', () => {
    const a = toAllergyIntolerance({ id: 'a2', label: 'Pólen das gramíneas' }, PATIENT);
    expect(a.code.text).toBe('Pólen das gramíneas');
    expect('coding' in a.code).toBe(false);
  });

  it('maps our three categories and refuses to guess a fourth', () => {
    expect(allergyCategory('farmaco')).toBe('medication');
    expect(allergyCategory('fármaco')).toBe('medication');
    expect(allergyCategory('alimento')).toBe('food');
    expect(allergyCategory('ambiental')).toBe('environment');
    expect(allergyCategory('qualquer coisa')).toBeUndefined();
    expect(allergyCategory(null)).toBeUndefined();
  });
});

describe('FHIR export — immunizations', () => {
  it('uses the CVX coding when we hold one', () => {
    const i = toImmunization(
      { id: 'i1', name: 'Hexavalente', date: '2023-04-10T00:00:00.000Z', cvx: '146' },
      PATIENT,
    );
    expect(i.status).toBe('completed');
    expect(i.vaccineCode.coding).toEqual([{ system: SYS.cvx, code: '146' }]);
    expect(i.vaccineCode.text).toBe('Hexavalente');
    expect(i.occurrenceDateTime).toBe('2023-04-10');
  });

  // The PNV abbreviation labels a slot in the national schedule; it is not a
  // vaccine code, so it must not sit in vaccineCode pretending to be one.
  it('keeps the PNV abbreviation as a note, not as a coding', () => {
    const i = toImmunization(
      { id: 'i2', name: 'VASPR', date: '2024-02-01T00:00:00.000Z', pnvAbbr: 'VASPR1' },
      PATIENT,
    );
    expect('coding' in i.vaccineCode).toBe(false);
    expect(i.note).toEqual([{ text: 'PNV: VASPR1' }]);
  });

  it('keeps both the clinical note and the schedule label when both exist', () => {
    const i = toImmunization(
      { id: 'i3', name: 'BCG', date: '2023-01-05', notes: 'sem reações', pnvAbbr: 'BCG' },
      PATIENT,
    );
    expect(i.note).toEqual([{ text: 'sem reações' }, { text: 'PNV: BCG' }]);
  });
});

describe('FHIR export — medication', () => {
  it('uses the ATC coding when we hold one and reflects whether it is current', () => {
    const m = toMedicationStatement(
      { id: 'm1', name: 'Amoxicilina', dose: '250 mg', frequency: '8/8h', route: 'oral', atcCode: 'J01CA04', active: true },
      PATIENT,
    );
    expect(m.status).toBe('active');
    expect(m.medicationCodeableConcept.coding).toEqual([{ system: SYS.atc, code: 'J01CA04' }]);
    expect(m.dosage[0].text).toBe('250 mg · 8/8h');
    expect(m.dosage[0].route).toEqual({ text: 'oral' });
  });

  it('marks a stopped medication as completed', () => {
    const m = toMedicationStatement({ id: 'm2', name: 'Ibuprofeno', active: false }, PATIENT);
    expect(m.status).toBe('completed');
  });

  it('omits dosage entirely when nothing about the dose was recorded', () => {
    const m = toMedicationStatement({ id: 'm3', name: 'Paracetamol', active: true }, PATIENT);
    expect('dosage' in m).toBe(false);
    expect('coding' in m.medicationCodeableConcept).toBe(false);
  });
});

describe('FHIR export — conditions', () => {
  it('emits both codings when the episode carries ICD-10 and ICPC-2', () => {
    const c = toCondition(
      { id: 'e1', title: 'Bronquiolite', icd10Code: 'J21.9', icpc2Code: 'R78', status: 'OPEN' },
      PATIENT,
    );
    expect(c.code.coding).toEqual([
      { system: SYS.icd10, code: 'J21.9' },
      { system: SYS.icpc2, code: 'R78' },
    ]);
    expect(c.clinicalStatus.coding[0].code).toBe('active');
  });

  it('resolves a closed episode and dates the resolution', () => {
    const c = toCondition(
      { id: 'e2', title: 'Otite', status: 'CLOSED', closedAt: '2026-03-01T09:00:00.000Z' },
      PATIENT,
    );
    expect(c.clinicalStatus.coding[0].code).toBe('resolved');
    expect(c.abatementDateTime).toBe('2026-03-01T09:00:00.000Z');
  });

  it('treats a closing date as closed even if the status field disagrees', () => {
    const c = toCondition(
      { id: 'e3', title: 'X', status: 'OPEN', closedAt: '2026-03-01T09:00:00.000Z' },
      PATIENT,
    );
    expect(c.clinicalStatus.coding[0].code).toBe('resolved');
  });
});

describe('FHIR export — documents', () => {
  const doc = {
    id: 'd1',
    title: 'Análises de março',
    kind: 'LAB',
    mime: 'application/pdf',
    sizeBytes: 51_200,
    issuedAt: '2026-03-02T00:00:00.000Z',
    createdAt: '2026-03-04T08:00:00.000Z',
  };

  // A record with a few PDFs inlined would be a multi-megabyte JSON that no
  // importer handles well, and the bytes are one authenticated request away.
  it('references the file without inlining a single byte of it', () => {
    const d = toDocumentReference(doc, PATIENT, '/api');
    const attachment = d.content[0].attachment;
    expect(d.status).toBe('current');
    expect(attachment.contentType).toBe('application/pdf');
    expect(attachment.size).toBe(51_200);
    expect(attachment.url).toBe(`/api/documents/${PATIENT}/d1`);
    expect('data' in attachment).toBe(false);
    expect(JSON.stringify(d)).not.toContain('base64');
  });
});

describe('FHIR export — the bundle', () => {
  const record = {
    child: { id: PATIENT, name: 'Rita', birthDate: '2023-02-10', sex: 'F' },
    growth: [{ id: 'g1', measuredAt: '2026-05-04T10:00:00.000Z', weightKg: 12 }],
    vitals: [{ id: 'v1', measuredAt: '2026-05-04T10:00:00.000Z', temperatureC: 38 }],
    allergies: [{ id: 'a1', label: 'Amendoim' }],
    vaccines: [{ id: 'i1', name: 'BCG', date: '2023-03-01' }],
    medications: [{ id: 'm1', name: 'Paracetamol', active: true }],
    episodes: [{ id: 'e1', title: 'Febre', status: 'OPEN' }],
    documents: [
      { id: 'd1', title: 'R', kind: 'LAB', mime: 'application/pdf', sizeBytes: 10, createdAt: '2026-03-04T08:00:00.000Z' },
    ],
  };

  it('is a collection Bundle with the patient first', () => {
    const b = toBundle(record, { now: new Date('2026-09-09T12:00:00.000Z') });
    expect(b.resourceType).toBe('Bundle');
    expect(b.type).toBe('collection');
    expect(b.timestamp).toBe('2026-09-09T12:00:00.000Z');
    expect(b.entry[0].resource.resourceType).toBe('Patient');
  });

  it('contains every part of the record exactly once', () => {
    const b = toBundle(record);
    const kinds = b.entry.map((e) => e.resource.resourceType as string);
    expect(kinds).toEqual([
      'Patient',
      'Observation',
      'Observation',
      'AllergyIntolerance',
      'Immunization',
      'MedicationStatement',
      'Condition',
      'DocumentReference',
    ]);
  });

  // In a collection Bundle there is no server base, so references resolve by
  // fullUrl. If those two ever disagree the bundle is a bag of orphans.
  it('resolves every subject reference to an entry in the same bundle', () => {
    const b = toBundle(record);
    const urls = new Set(b.entry.map((e) => e.fullUrl));
    for (const { resource } of b.entry) {
      const target = resource.subject ?? resource.patient;
      if (!target) continue;
      expect(urls.has(target.reference)).toBe(true);
    }
  });

  it('gives every entry a fullUrl that matches its resource id', () => {
    const b = toBundle(record);
    for (const e of b.entry) expect(e.fullUrl).toBe(`urn:uuid:${e.resource.id}`);
    expect(new Set(b.entry.map((e) => e.fullUrl)).size).toBe(b.entry.length);
  });

  it('is a Patient-only bundle for a child with no record yet', () => {
    const b = toBundle({ child: { id: PATIENT, name: 'Novo', birthDate: '2026-01-01' } });
    expect(b.entry).toHaveLength(1);
    expect(b.entry[0].resource.resourceType).toBe('Patient');
  });

  // JSON.stringify silently drops undefined, but an object with the key
  // present and undefined survives a structuredClone and other paths. Assert
  // on the object, not on the serialised string.
  it('leaves no key present with an undefined value', () => {
    const b = toBundle(record);
    const holes: string[] = [];
    const walk = (v: unknown, path: string): void => {
      if (Array.isArray(v)) return v.forEach((x, i) => walk(x, `${path}[${i}]`));
      if (v && typeof v === 'object') {
        for (const [k, val] of Object.entries(v)) {
          if (val === undefined) holes.push(`${path}.${k}`);
          walk(val, `${path}.${k}`);
        }
      }
    };
    walk(b, 'bundle');
    expect(holes).toEqual([]);
  });
});
