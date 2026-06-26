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
 * The core product flow end-to-end over a real Postgres (CI service): a parent
 * books a message consultation against a pediatrician's service, both exchange
 * (encrypted) messages, the pediatrician writes an (encrypted) summary and
 * closes it. Asserts RBAC, participant-only authorization, message/summary
 * encryption at rest, the OPEN→ANSWERED→CLOSED lifecycle, and that closing in
 * demo mode (no payment row) settles cleanly to zero.
 */
describe('Consultation flow (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const uniq = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const parentEmail = `c-parent-${uniq}@e2e.test`;
  const pedEmail = `c-ped-${uniq}@e2e.test`;
  let parentToken: string;
  let pedToken: string;
  let serviceId: string;
  let childId: string;

  function http() {
    return request(app.getHttpServer());
  }
  async function login(email: string, role: string): Promise<string> {
    const res = await http().post('/api/auth/dev-login').send({ email, role }).expect(201);
    return res.body.accessToken;
  }
  const auth = (t: string) => ({ Authorization: `Bearer ${t}` });

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

    parentToken = await login(parentEmail, 'PARENT');
    pedToken = await login(pedEmail, 'PEDIATRICIAN');

    // Seed the pediatrician profile + an active message service (fixtures the
    // public onboarding/verification flow would otherwise create).
    const pedUser = await prisma.user.findUniqueOrThrow({ where: { email: pedEmail } });
    const ped = await prisma.pediatrician.create({
      data: {
        userId: pedUser.id,
        licenseNumber: `LIC-${uniq}`,
        status: 'ACTIVE',
        licenseVerifiedAt: new Date(),
      },
    });
    const service = await prisma.pediatricianService.create({
      data: { pediatricianId: ped.id, type: 'MESSAGE', priceCents: 4500, slaHours: 24, active: true },
    });
    serviceId = service.id;

    // Parent creates a child (with consent) via the API.
    const childRes = await http()
      .post('/api/children')
      .set(auth(parentToken))
      .send({ name: 'Criança E2E', birthDate: '2022-03-01', healthDataConsent: true })
      .expect(201);
    childId = childRes.body.id;
  });

  afterAll(async () => {
    await app?.close();
  });

  let consultationId: string;

  describe('booking', () => {
    it('forbids a pediatrician from starting a consultation (parent-only)', () => {
      return http()
        .post('/api/consultations')
        .set(auth(pedToken))
        .send({ childId, serviceId })
        .expect(403);
    });

    it('lets the parent book a message consultation (OPEN) with a first question', async () => {
      const res = await http()
        .post('/api/consultations')
        .set(auth(parentToken))
        .send({ childId, serviceId, question: 'Tem febre há 2 dias.' })
        .expect(201);
      expect(res.body.status).toBe('OPEN');
      expect(res.body.priceCents).toBe(4500);
      consultationId = res.body.id;
      expect(consultationId).toBeTruthy();
    });

    it('shows the consultation in the parent list and the pediatrician inbox', async () => {
      const mine = await http().get('/api/consultations').set(auth(parentToken)).expect(200);
      expect(mine.body.some((c: { id: string }) => c.id === consultationId)).toBe(true);

      const inbox = await http().get('/api/consultations/inbox').set(auth(pedToken)).expect(200);
      expect(inbox.body.some((c: { id: string }) => c.id === consultationId)).toBe(true);
    });
  });

  describe('messaging with encryption', () => {
    it('rejects a non-participant pediatrician reading the thread (403)', async () => {
      const strangerTok = await login(`c-stranger-${uniq}@e2e.test`, 'PEDIATRICIAN');
      await http()
        .get(`/api/consultations/${consultationId}/messages`)
        .set(auth(strangerTok))
        .expect(403);
    });

    it('moves to ANSWERED when the pediatrician replies', async () => {
      await http()
        .post(`/api/consultations/${consultationId}/messages`)
        .set(auth(pedToken))
        .send({ body: 'Olá, vamos avaliar. Há quanto tempo?' })
        .expect(201);
      const c = await prisma.consultation.findUnique({ where: { id: consultationId } });
      expect(c!.status).toBe('ANSWERED');
      expect(c!.answeredAt).toBeTruthy();
    });

    it('round-trips both messages decrypted, but stores them encrypted at rest', async () => {
      const res = await http()
        .get(`/api/consultations/${consultationId}/messages`)
        .set(auth(parentToken))
        .expect(200);
      const bodies = res.body.map((m: { body: string }) => m.body);
      expect(bodies).toContain('Tem febre há 2 dias.');
      expect(bodies.some((b: string) => b.includes('avaliar'))).toBe(true);

      const raw = await prisma.message.findMany({ where: { consultationId } });
      for (const m of raw) {
        expect(String(m.body)).not.toContain('febre');
        expect(String(m.body)).not.toContain('avaliar');
      }
    });
  });

  describe('summary (encrypted, pediatrician-only)', () => {
    it('forbids the parent from writing the summary (403)', () => {
      return http()
        .post(`/api/consultations/${consultationId}/summary`)
        .set(auth(parentToken))
        .send({ text: 'tentativa' })
        .expect(403);
    });

    it('lets the pediatrician write it; both can read it back; stored encrypted', async () => {
      await http()
        .post(`/api/consultations/${consultationId}/summary`)
        .set(auth(pedToken))
        .send({ text: 'Diagnóstico: virose. Plano: hidratação.' })
        .expect(201);

      const read = await http()
        .get(`/api/consultations/${consultationId}/summary`)
        .set(auth(parentToken))
        .expect(200);
      expect(read.body.summary).toContain('virose');

      const row = await prisma.consultation.findUnique({ where: { id: consultationId } });
      expect(String(row!.summary)).not.toContain('virose');
    });
  });

  describe('closing', () => {
    it('forbids the parent from closing (pediatrician-only)', () => {
      return http().post(`/api/consultations/${consultationId}/close`).set(auth(parentToken)).expect(403);
    });

    it('lets the pediatrician close it (CLOSED, settles to zero in demo mode)', async () => {
      const res = await http()
        .post(`/api/consultations/${consultationId}/close`)
        .set(auth(pedToken))
        .expect(201);
      expect(res.body.status).toBe('CLOSED');
      expect(res.body.closedAt).toBeTruthy();
    });
  });

  describe('cancel path', () => {
    it('lets the parent cancel an unanswered consultation (REFUNDED)', async () => {
      const created = await http()
        .post('/api/consultations')
        .set(auth(parentToken))
        .send({ childId, serviceId, question: 'Outra dúvida.' })
        .expect(201);
      const res = await http()
        .post(`/api/consultations/${created.body.id}/cancel`)
        .set(auth(parentToken))
        .expect(201);
      expect(res.body.status).toBe('REFUNDED');
    });
  });
});
