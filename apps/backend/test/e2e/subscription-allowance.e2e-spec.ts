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
 * The subscription allowance end-to-end: a family plan includes N message
 * consultations a month, they are consumed by actually starting consultations,
 * and the N+1th is charged. Run against a real Postgres, because the whole
 * point is that usage is derived from the consultations table rather than from
 * a counter that could drift away from it.
 */
describe('Subscription allowance flow (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const uniq = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  let token: string;
  let childId: string;
  let messageServiceId: string;

  function http() {
    return request(app.getHttpServer());
  }
  async function login(email: string, role: string): Promise<string> {
    const res = await http().post('/api/auth/dev-login').send({ email, role }).expect(201);
    return res.body.accessToken;
  }
  const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });

  const startConsultation = () =>
    http()
      .post('/api/consultations')
      .set(bearer(token))
      .send({ childId, serviceId: messageServiceId, question: 'Tem febre desde ontem.' });

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

    token = await login(`sub-parent-${uniq}@e2e.test`, 'PARENT');
    const child = await http()
      .post('/api/children')
      .set(bearer(token))
      .send({ name: 'Rita Plano', birthDate: '2023-02-10', healthDataConsent: true })
      .expect(201);
    childId = child.body.id;

    // Any active pediatrician with a MESSAGE service (the seed provides them).
    const peds = await http().get('/api/pediatricians').set(bearer(token)).expect(200);
    for (const p of peds.body) {
      const svc = (p.services ?? []).find((s: { type: string }) => s.type === 'MESSAGE');
      if (svc) {
        messageServiceId = svc.id;
        break;
      }
    }
    expect(messageServiceId).toBeTruthy();
  });

  afterAll(async () => {
    await app?.close();
  });

  describe('without a plan', () => {
    it('reports no allowance', async () => {
      const res = await http().get('/api/subscriptions/allowance').set(bearer(token)).expect(200);
      expect(res.body).toEqual(
        expect.objectContaining({ plan: null, includedMessages: 0, remainingMessages: 0 }),
      );
    });

    it('charges the consultation', async () => {
      const res = await startConsultation().expect(201);
      const row = await prisma.consultation.findUniqueOrThrow({ where: { id: res.body.id } });
      expect(row.coveredBySubscription).toBe(false);
    });
  });

  describe('with the family plan', () => {
    beforeAll(async () => {
      await http()
        .post('/api/subscriptions')
        .set(bearer(token))
        .send({ plan: 'FAMILY' })
        .expect(201);
    });

    it('reports what the plan includes', async () => {
      const res = await http().get('/api/subscriptions/allowance').set(bearer(token)).expect(200);
      expect(res.body.plan).toBe('FAMILY');
      expect(res.body.includedMessages).toBe(2);
      expect(res.body.remainingMessages).toBe(2);
    });

    it('covers the included consultations and counts them down', async () => {
      for (let i = 0; i < 2; i++) {
        const res = await startConsultation().expect(201);
        const row = await prisma.consultation.findUniqueOrThrow({ where: { id: res.body.id } });
        expect(row.coveredBySubscription).toBe(true);
      }
      const after = await http().get('/api/subscriptions/allowance').set(bearer(token)).expect(200);
      expect(after.body.usedMessages).toBe(2);
      expect(after.body.remainingMessages).toBe(0);
    });

    it('charges the one after the allowance is spent', async () => {
      const res = await startConsultation().expect(201);
      const row = await prisma.consultation.findUniqueOrThrow({ where: { id: res.body.id } });
      expect(row.coveredBySubscription).toBe(false);
    });

    // A covered consultation asks the family for nothing, but the pediatrician
    // is still owed the fee — the platform pays it out of subscription revenue.
    it('creates no charge for the family, at the full fee, on a covered consultation', async () => {
      const covered = await prisma.consultation.findFirst({
        where: { childId, coveredBySubscription: true },
      });
      expect(covered).toBeTruthy();
      await http()
        .post('/api/payments/intent')
        .set(bearer(token))
        .send({ consultationId: covered!.id })
        .expect(201);
      const payment = await prisma.payment.findUniqueOrThrow({
        where: { consultationId: covered!.id },
      });
      expect(payment.psp).toBe('subscription');
      expect(payment.amountCents).toBe(covered!.priceCents);
    });
  });

  describe('access control', () => {
    it('requires authentication (401)', () => {
      return http().get('/api/subscriptions/allowance').expect(401);
    });

    it('is a parent endpoint (403 for a pediatrician)', async () => {
      const ped = await login(`sub-ped-${uniq}@e2e.test`, 'PEDIATRICIAN');
      await http().get('/api/subscriptions/allowance').set(bearer(ped)).expect(403);
    });
  });
});
