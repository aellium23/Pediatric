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
      expect(row.coveredCents).toBe(0);
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
      expect(res.body.includedMessages).toBe(1);
      expect(res.body.remainingMessages).toBe(1);
    });

    it('covers the included consultations and counts them down', async () => {
      const included = 1;
      for (let i = 0; i < included; i++) {
        const res = await startConsultation().expect(201);
        const row = await prisma.consultation.findUniqueOrThrow({ where: { id: res.body.id } });
        expect(row.coveredCents).toBe(row.priceCents);
      }
      const after = await http().get('/api/subscriptions/allowance').set(bearer(token)).expect(200);
      expect(after.body.usedMessages).toBe(included);
      expect(after.body.remainingMessages).toBe(0);
    });

    it('charges the one after the allowance is spent', async () => {
      const res = await startConsultation().expect(201);
      const row = await prisma.consultation.findUniqueOrThrow({ where: { id: res.body.id } });
      expect(row.coveredCents).toBe(0);
    });

    // A covered consultation asks the family for nothing, but the pediatrician
    // is still owed the fee — the platform pays it out of subscription revenue.
    it('creates no charge for the family, at the full fee, on a covered consultation', async () => {
      const covered = await prisma.consultation.findFirst({
        where: { childId, coveredCents: { gt: 0 } },
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
      expect(payment.subsidyCents).toBe(covered!.priceCents);
    });
  });

  /**
   * The cap is what bounds the platform's exposure: the inclusion is a promise
   * the platform makes, but the price belongs to each pediatrician. Above the
   * cap the family pays the difference, and the platform's cost per included
   * consultation stops rising.
   */
  describe('the per-consultation cap', () => {
    let expensiveServiceId: string;
    let capToken: string;
    let capChildId: string;

    beforeAll(async () => {
      // A pediatrician whose message consultation costs more than the cap.
      // dev-login mints the account; the Pediatrician row is created here so
      // this test owns its own price and cannot disturb the seeded ones.
      await login(`sub-cap-ped-${uniq}@e2e.test`, 'PEDIATRICIAN');
      const pedUser = await prisma.user.findFirstOrThrow({
        where: { email: `sub-cap-ped-${uniq}@e2e.test` },
      });
      const pedRow = await prisma.pediatrician.create({
        data: {
          userId: pedUser.id,
          licenseNumber: `OM-CAP-${uniq}`,
          displayName: 'Dr. Caro',
          status: 'ACTIVE',
        },
      });
      const svc = await prisma.pediatricianService.create({
        data: { pediatricianId: pedRow.id, type: 'MESSAGE', priceCents: 3000, slaHours: 24 },
      });
      expensiveServiceId = svc.id;

      // A fresh family, so this month's allowance is untouched.
      capToken = await login(`sub-cap-parent-${uniq}@e2e.test`, 'PARENT');
      const child = await http()
        .post('/api/children')
        .set(bearer(capToken))
        .send({ name: 'Cap Teste', birthDate: '2024-01-10', healthDataConsent: true })
        .expect(201);
      capChildId = child.body.id;
      await http()
        .post('/api/subscriptions')
        .set(bearer(capToken))
        .send({ plan: 'FAMILY' })
        .expect(201);
    });

    it('covers only up to the cap on a consultation priced above it', async () => {
      const res = await http()
        .post('/api/consultations')
        .set(bearer(capToken))
        .send({ childId: capChildId, serviceId: expensiveServiceId, question: 'Tosse há uma semana.' })
        .expect(201);
      const row = await prisma.consultation.findUniqueOrThrow({ where: { id: res.body.id } });
      expect(row.priceCents).toBe(3000);
      expect(row.coveredCents).toBe(2000);
    });

    // The half that makes the cap a product feature rather than a limitation:
    // the family is charged the difference, not the whole price.
    it('charges the family only the difference', async () => {
      const row = await prisma.consultation.findFirstOrThrow({
        where: { childId: capChildId },
      });
      await http()
        .post('/api/payments/intent')
        .set(bearer(capToken))
        .send({ consultationId: row.id })
        .expect(201);
      const payment = await prisma.payment.findUniqueOrThrow({
        where: { consultationId: row.id },
      });
      // The act keeps its full value — that is what the pediatrician is paid on.
      expect(payment.amountCents).toBe(3000);
      expect(payment.subsidyCents).toBe(2000);
      expect(payment.amountCents - payment.subsidyCents).toBe(1000);
      // Not a fully-covered consultation: there is a real charge to make.
      expect(payment.psp).not.toBe('subscription');
    });

    it('still spends the allowance for the month', async () => {
      const after = await http()
        .get('/api/subscriptions/allowance')
        .set(bearer(capToken))
        .expect(200);
      expect(after.body.usedMessages).toBe(1);
      expect(after.body.remainingMessages).toBe(0);
      expect(after.body.coveredCapCents).toBe(2000);
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
