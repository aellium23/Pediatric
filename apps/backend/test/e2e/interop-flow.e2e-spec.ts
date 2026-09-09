import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

// Dev-login must be enabled BEFORE the module (and its config factory) loads.
process.env.ENABLE_DEV_LOGIN = 'true';
process.env.NODE_ENV = process.env.NODE_ENV ?? 'test';

import { AppModule } from '../../src/app.module';
import { AllExceptionsFilter } from '../../src/common/filters/http-exception.filter';
import { PrismaService } from '../../src/common/prisma/prisma.service';

/**
 * FHIR export end-to-end against a real Postgres.
 *
 * The unit tests prove the mapping; this proves the two things only a database
 * can: that the clinical fields come out DECRYPTED into the bundle (they are
 * AES-256-GCM ciphertext at rest, and an export of ciphertext would be a
 * silent, plausible-looking failure), and that one family cannot export
 * another family's child.
 */
describe('Interop / FHIR export flow (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const uniq = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  let token: string;
  let childId: string;

  function http() {
    return request(app.getHttpServer());
  }
  async function login(email: string, role: string): Promise<string> {
    const res = await http().post('/api/auth/dev-login').send({ email, role }).expect(201);
    return res.body.accessToken;
  }
  const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });
  // The bundle arrives as untyped JSON over HTTP; `any` here is what the wire
  // actually is, and asserting on shapes is the whole job of these tests.
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const entries = (body: any, type: string): any[] =>
    (body.entry as any[])
      .filter((e) => e.resource.resourceType === type)
      .map((e) => e.resource);

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api', { exclude: ['health', 'health/ready', 'metrics'] });
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
    prisma = app.get(PrismaService);

    token = await login(`fhir-parent-${uniq}@e2e.test`, 'PARENT');
    const child = await http()
      .post('/api/children')
      .set(bearer(token))
      .send({ name: 'Tomás Interop', birthDate: '2023-04-12', sex: 'M', healthDataConsent: true })
      .expect(201);
    childId = child.body.id;

    const rec = `/api/health-records/${childId}`;
    await http()
      .post(`${rec}/growth`)
      .set(bearer(token))
      .send({ measuredAt: '2026-05-04', weightKg: 13.2, heightCm: 92, headCm: 48 })
      .expect(201);
    await http()
      .post(`${rec}/vitals`)
      .set(bearer(token))
      .send({ measuredAt: '2026-05-04', temperatureC: 38.4, heartRateBpm: 118 })
      .expect(201);
    await http()
      .post(`${rec}/allergies`)
      .set(bearer(token))
      .send({ label: 'Amendoim', category: 'alimento' })
      .expect(201);
    await http()
      .post(`${rec}/vaccines`)
      .set(bearer(token))
      .send({ name: 'Hexavalente', date: '2023-06-15', cvx: '146' })
      .expect(201);
    await http()
      .post(`${rec}/medications`)
      .set(bearer(token))
      .send({ name: 'Amoxicilina', dose: '250 mg', atcCode: 'J01CA04' })
      .expect(201);
    await http()
      .post(`${rec}/episodes`)
      .set(bearer(token))
      .send({ title: 'Bronquiolite', icd10Code: 'J21.9' })
      .expect(201);
    await http()
      .post(`/api/documents/${childId}`)
      .set(bearer(token))
      .send({
        title: 'Análises de maio',
        kind: 'LAB',
        content: 'data:application/pdf;base64,JVBERi0xLjQKJcTl8uXrp/Og0MTGCg==',
      })
      .expect(201);
  });

  afterAll(async () => {
    await app?.close();
  });

  describe('access control', () => {
    it('requires authentication (401)', () => {
      return http().get(`/api/interop/fhir/${childId}`).expect(401);
    });

    it("denies another family the child's record (403)", async () => {
      const other = await login(`fhir-other-${uniq}@e2e.test`, 'PARENT');
      await http().get(`/api/interop/fhir/${childId}`).set(bearer(other)).expect(403);
    });

    // Portability is the family's right. A pediatrician reads the chart inside
    // the consultation they are part of; a bulk download is a different shape
    // of egress and is not theirs to ask for.
    it('is not open to a pediatrician (403)', async () => {
      const ped = await login(`fhir-ped-${uniq}@e2e.test`, 'PEDIATRICIAN');
      await http().get(`/api/interop/fhir/${childId}`).set(bearer(ped)).expect(403);
    });
  });

  describe('the bundle', () => {
    it('is a FHIR R4 collection bundle for this child', async () => {
      const res = await http().get(`/api/interop/fhir/${childId}`).set(bearer(token)).expect(200);
      expect(res.body.resourceType).toBe('Bundle');
      expect(res.body.type).toBe('collection');
      const [patient] = entries(res.body, 'Patient');
      expect(patient.id).toBe(childId);
      expect(patient.birthDate).toBe('2023-04-12');
      expect(patient.gender).toBe('male');
    });

    // The point of the whole endpoint: these fields are ciphertext in the
    // database. An export of ciphertext would look fine and be useless.
    it('carries the clinical text decrypted, and the database still holds it encrypted', async () => {
      const res = await http().get(`/api/interop/fhir/${childId}`).set(bearer(token)).expect(200);
      expect(entries(res.body, 'AllergyIntolerance')[0].code.text).toBe('Amendoim');
      expect(entries(res.body, 'Immunization')[0].vaccineCode.text).toBe('Hexavalente');
      expect(entries(res.body, 'MedicationStatement')[0].medicationCodeableConcept.text).toBe(
        'Amoxicilina',
      );
      expect(entries(res.body, 'Condition')[0].code.text).toBe('Bronquiolite');

      const raw = await prisma.allergy.findFirstOrThrow({ where: { childId } });
      expect(raw.label).not.toContain('Amendoim');
    });

    it('brings the coded fields through untouched', async () => {
      const res = await http().get(`/api/interop/fhir/${childId}`).set(bearer(token)).expect(200);
      expect(entries(res.body, 'Immunization')[0].vaccineCode.coding).toEqual([
        { system: 'http://hl7.org/fhir/sid/cvx', code: '146' },
      ]);
      expect(entries(res.body, 'MedicationStatement')[0].medicationCodeableConcept.coding).toEqual([
        { system: 'http://www.whocc.no/atc', code: 'J01CA04' },
      ]);
      expect(entries(res.body, 'Condition')[0].code.coding).toEqual([
        { system: 'http://hl7.org/fhir/sid/icd-10', code: 'J21.9' },
      ]);
    });

    it('turns the growth row into three coded Observations', async () => {
      const res = await http().get(`/api/interop/fhir/${childId}`).set(bearer(token)).expect(200);
      const codes = entries(res.body, 'Observation').map((o) => o.code.coding[0].code);
      expect(codes).toEqual(expect.arrayContaining(['29463-7', '8302-2', '9843-4', '8310-5', '8867-4']));
    });

    it('references the vault document without carrying the file', async () => {
      const res = await http().get(`/api/interop/fhir/${childId}`).set(bearer(token)).expect(200);
      const [doc] = entries(res.body, 'DocumentReference');
      expect(doc.content[0].attachment.contentType).toBe('application/pdf');
      expect(doc.content[0].attachment.url).toContain(`/documents/${childId}/`);
      expect(JSON.stringify(res.body)).not.toContain('JVBERi0xLjQ');
    });
  });

  // Art. 20 asks for a structured, commonly used, machine-readable format. The
  // account dump was structured and machine-readable but only commonly used by
  // us — and, until the bundles were added, carried no clinical record at all.
  describe('GDPR export', () => {
    it('carries the full record, not just the account', async () => {
      const res = await http().get('/api/privacy/export').set(bearer(token)).expect(200);
      expect(Array.isArray(res.body.records)).toBe(true);
      const bundle = res.body.records.find((b: any) =>
        b.entry.some((e: any) => e.resource.resourceType === 'Patient' && e.resource.id === childId),
      );
      expect(bundle).toBeTruthy();
      expect(entries(bundle, 'AllergyIntolerance')[0].code.text).toBe('Amendoim');
    });

    it('gives a pediatrician no child records', async () => {
      const ped = await login(`fhir-ped2-${uniq}@e2e.test`, 'PEDIATRICIAN');
      const res = await http().get('/api/privacy/export').set(bearer(ped)).expect(200);
      expect(res.body.records).toEqual([]);
    });
  });
});
