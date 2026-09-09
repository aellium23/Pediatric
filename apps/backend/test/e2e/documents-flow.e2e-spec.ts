import { INestApplication, ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';

// Dev-login must be enabled BEFORE the module (and its config factory) loads.
process.env.ENABLE_DEV_LOGIN = 'true';
process.env.NODE_ENV = process.env.NODE_ENV ?? 'test';

import { AppModule } from '../../src/app.module';
import { AllExceptionsFilter } from '../../src/common/filters/http-exception.filter';
import { PrismaService } from '../../src/common/prisma/prisma.service';

/**
 * The document vault end-to-end over a real Postgres: upload, list, fetch,
 * delete — plus the two things that only a real database can prove, namely
 * that the title and the file are ciphertext at rest and that another family
 * cannot reach them.
 */
describe('Document vault flow (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const uniq = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const parentEmail = `doc-parent-${uniq}@e2e.test`;
  let token: string;
  let childId: string;
  let docId: string;

  // A tiny but genuinely valid PDF header, base64-encoded.
  const PDF = 'data:application/pdf;base64,JVBERi0xLjQKJcTl8uXrp/Og0MTGCg==';
  const TITLE = 'Análises — hemograma completo';

  function http() {
    return request(app.getHttpServer());
  }
  async function login(email: string, role: string): Promise<string> {
    const res = await http().post('/api/auth/dev-login').send({ email, role }).expect(201);
    return res.body.accessToken;
  }
  const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    // Mirror main.ts: without the raised body limit the harness would reject a
    // multi-megabyte upload at 100 kB and never reach the vault's own cap —
    // testing the default parser instead of the product.
    const express = moduleRef.createNestApplication<NestExpressApplication>({ rawBody: true });
    express.useBodyParser('json', { limit: '6mb' });
    app = express;
    app.setGlobalPrefix('api', { exclude: ['health', 'health/ready', 'metrics'] });
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
    prisma = app.get(PrismaService);

    token = await login(parentEmail, 'PARENT');
    const child = await http()
      .post('/api/children')
      .set(bearer(token))
      .send({ name: 'Inês Cofre', birthDate: '2022-03-15', healthDataConsent: true })
      .expect(201);
    childId = child.body.id;
  });

  afterAll(async () => {
    await app?.close();
  });

  describe('access control', () => {
    it('requires authentication (401)', () => {
      return http().get(`/api/documents/${childId}`).expect(401);
    });

    it("denies another family the child's vault (403)", async () => {
      const other = await login(`doc-other-${uniq}@e2e.test`, 'PARENT');
      await http().get(`/api/documents/${childId}`).set(bearer(other)).expect(403);
      await http()
        .post(`/api/documents/${childId}`)
        .set(bearer(other))
        .send({ title: 'Intruso', content: PDF })
        .expect(403);
    });

    it('denies a pediatrician with no consultation for this child (403)', async () => {
      const ped = await login(`doc-ped-${uniq}@e2e.test`, 'PEDIATRICIAN');
      await http().get(`/api/documents/${childId}`).set(bearer(ped)).expect(403);
    });
  });

  describe('upload', () => {
    it('stores a PDF and derives its mime and size', async () => {
      const res = await http()
        .post(`/api/documents/${childId}`)
        .set(bearer(token))
        .send({ title: TITLE, kind: 'LAB', content: PDF, issuedAt: '2026-08-20' })
        .expect(201);
      docId = res.body.id;
      expect(res.body.mime).toBe('application/pdf');
      expect(res.body.sizeBytes).toBeGreaterThan(0);
    });

    it('rejects a file type that is not a document (400)', async () => {
      await http()
        .post(`/api/documents/${childId}`)
        .set(bearer(token))
        .send({ title: 'Script', content: 'data:text/html;base64,PHNjcmlwdD4=' })
        .expect(400);
    });

    // The declared mime is client-controlled; the bytes are what a
    // pediatrician's browser will actually open.
    it('rejects a file whose bytes disagree with its label (400)', async () => {
      const png = Buffer.concat([
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        Buffer.alloc(8, 1),
      ]);
      const res = await http()
        .post(`/api/documents/${childId}`)
        .set(bearer(token))
        .send({ title: 'Disfarçado', content: `data:application/pdf;base64,${png.toString('base64')}` })
        .expect(400);
      expect(JSON.stringify(res.body)).toMatch(/não corresponde/i);
    });

    it('rejects an oversized file with a readable message (400)', async () => {
      const res = await http()
        .post(`/api/documents/${childId}`)
        .set(bearer(token))
        .send({ title: 'Enorme', content: `data:application/pdf;base64,${'A'.repeat(4_000_001)}` })
        .expect(400);
      expect(JSON.stringify(res.body)).toMatch(/demasiado grande/i);
    });
  });

  describe('encryption at rest', () => {
    it('stores the title and the file as ciphertext, not as sent', async () => {
      const row = await prisma.childDocument.findUniqueOrThrow({ where: { id: docId } });
      expect(row.title).not.toContain('hemograma');
      expect(row.content).not.toContain('JVBERi0xLjQ');
      // The unencrypted metadata a list needs is readable, as intended.
      expect(row.mime).toBe('application/pdf');
      expect(row.kind).toBe('LAB');
    });
  });

  describe('read back', () => {
    it('lists the document with its title decrypted and without the bytes', async () => {
      const res = await http().get(`/api/documents/${childId}`).set(bearer(token)).expect(200);
      const row = res.body.find((d: { id: string }) => d.id === docId);
      expect(row.title).toBe(TITLE);
      expect(row.kind).toBe('LAB');
      expect(row.content).toBeUndefined();
    });

    it('returns the file only when the document is opened', async () => {
      const res = await http()
        .get(`/api/documents/${childId}/${docId}`)
        .set(bearer(token))
        .expect(200);
      expect(res.body.content).toBe(PDF);
      expect(res.body.title).toBe(TITLE);
    });

    it('404s for a document id that is not this child’s', async () => {
      await http()
        .get(`/api/documents/${childId}/11111111-1111-1111-1111-111111111111`)
        .set(bearer(token))
        .expect(404);
    });
  });

  // The model only ever proposes: this endpoint returns a reading and writes
  // nothing. Everything in the child's record still goes through the ordinary
  // allergy/vaccine/medication endpoints, after the parent ticks a box.
  describe('AI reading', () => {
    it('is the parent’s to ask for, not another family’s (403)', async () => {
      const other = await login(`doc-read-other-${uniq}@e2e.test`, 'PARENT');
      await http()
        .post(`/api/documents/${childId}/${docId}/read`)
        .set(bearer(other))
        .expect(403);
    });

    it('is not open to a pediatrician (403)', async () => {
      const ped = await login(`doc-read-ped-${uniq}@e2e.test`, 'PEDIATRICIAN');
      await http().post(`/api/documents/${childId}/${docId}/read`).set(bearer(ped)).expect(403);
    });

    it('404s for a document id that is not this child’s', async () => {
      await http()
        .post(`/api/documents/${childId}/11111111-1111-1111-1111-111111111111/read`)
        .set(bearer(token))
        .expect(404);
    });

    // No key in CI, and none in the demo environment either: the feature has to
    // say "not available" rather than fail the upload flow around it.
    it('answers with no reading when the model is not configured', async () => {
      const res = await http()
        .post(`/api/documents/${childId}/${docId}/read`)
        .set(bearer(token))
        .expect(201);
      expect(res.text).toBe('');
    });

    it('writes nothing to the record on its own', async () => {
      const record = await http()
        .get(`/api/health-records/${childId}`)
        .set(bearer(token))
        .expect(200);
      expect(record.body.allergies ?? []).toEqual([]);
      expect(record.body.vaccines ?? []).toEqual([]);
      expect(record.body.medications ?? []).toEqual([]);
    });
  });

  describe('delete', () => {
    it('removes the document and it stops being listed', async () => {
      await http()
        .post(`/api/documents/${childId}/${docId}/remove`)
        .set(bearer(token))
        .expect(201);
      const res = await http().get(`/api/documents/${childId}`).set(bearer(token)).expect(200);
      expect(res.body.find((d: { id: string }) => d.id === docId)).toBeUndefined();
    });
  });
});
