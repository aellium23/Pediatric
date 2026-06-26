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
 * The clinical record end-to-end over a real Postgres (CI service): growth with
 * server-computed BMI, encrypted vaccines/medications, the medication
 * active toggle and the episode lifecycle — plus parent-ownership access
 * control. Asserts encryption at rest and the BMI math, not just responses.
 */
describe('Health records flow (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const uniq = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const parentEmail = `hr-parent-${uniq}@e2e.test`;
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

    token = await login(parentEmail, 'PARENT');
    const child = await http()
      .post('/api/children')
      .set(bearer(token))
      .send({ name: 'Duarte Saúde', birthDate: '2021-06-01', healthDataConsent: true })
      .expect(201);
    childId = child.body.id;
  });

  afterAll(async () => {
    await app?.close();
  });

  describe('access control', () => {
    it('requires authentication (401)', () => {
      return http().get(`/api/health-records/${childId}`).expect(401);
    });

    it("denies another parent access to this child's records (403)", async () => {
      const other = await login(`hr-other-${uniq}@e2e.test`, 'PARENT');
      await http().get(`/api/health-records/${childId}`).set(bearer(other)).expect(403);
    });

    it('denies a pediatrician with no consultation for this child (403)', async () => {
      const ped = await login(`hr-ped-${uniq}@e2e.test`, 'PEDIATRICIAN');
      await http().get(`/api/health-records/${childId}`).set(bearer(ped)).expect(403);
    });
  });

  describe('growth with server-computed BMI', () => {
    it('records a measurement and returns the rounded BMI', async () => {
      await http()
        .post(`/api/health-records/${childId}/growth`)
        .set(bearer(token))
        .send({ measuredAt: '2024-06-01', heightCm: 80, weightKg: 11 })
        .expect(201);

      const ov = await http().get(`/api/health-records/${childId}`).set(bearer(token)).expect(200);
      // 11 / (0.80^2) = 17.1875 → rounded to 1dp = 17.2.
      expect(ov.body.growth).toHaveLength(1);
      expect(ov.body.growth[0].bmi).toBe(17.2);
    });
  });

  describe('encrypted vaccines & medications', () => {
    it('stores a vaccine encrypted at rest but returns it decrypted', async () => {
      await http()
        .post(`/api/health-records/${childId}/vaccines`)
        .set(bearer(token))
        .send({ name: 'VASPR', date: '2023-06-01', notes: 'sem reações' })
        .expect(201);

      const ov = await http().get(`/api/health-records/${childId}`).set(bearer(token)).expect(200);
      expect(ov.body.vaccines.some((v: { name: string }) => v.name === 'VASPR')).toBe(true);

      const raw = await prisma.vaccination.findMany({ where: { childId } });
      expect(raw.length).toBeGreaterThanOrEqual(1);
      expect(String(raw[0].name)).not.toContain('VASPR');
    });

    it('adds a medication and toggles it inactive', async () => {
      const created = await http()
        .post(`/api/health-records/${childId}/medications`)
        .set(bearer(token))
        .send({ name: 'Paracetamol', dose: '120mg/5ml' })
        .expect(201);
      const medId = created.body.id;

      await http()
        .post(`/api/health-records/${childId}/medications/${medId}/active`)
        .set(bearer(token))
        .send({ active: false })
        .expect(201);

      const ov = await http().get(`/api/health-records/${childId}`).set(bearer(token)).expect(200);
      const med = ov.body.medications.find((m: { id: string }) => m.id === medId);
      expect(med).toBeTruthy();
      expect(med.name).toBe('Paracetamol');
      expect(med.active).toBe(false);
    });
  });

  describe('episode lifecycle', () => {
    it('opens and then closes an episode', async () => {
      const created = await http()
        .post(`/api/health-records/${childId}/episodes`)
        .set(bearer(token))
        .send({ title: 'Otite', summary: 'Dor de ouvido direito' })
        .expect(201);
      const epId = created.body.id;

      await http()
        .post(`/api/health-records/${childId}/episodes/${epId}/close`)
        .set(bearer(token))
        .expect(201);

      const row = await prisma.episode.findUnique({ where: { id: epId } });
      expect(row!.status).toBe('CLOSED');
      expect(row!.closedAt).toBeTruthy();
    });
  });
});
