import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

process.env.ENABLE_DEV_LOGIN = 'true';
process.env.NODE_ENV = process.env.NODE_ENV ?? 'test';

import { AppModule } from '../../src/app.module';
import { AllExceptionsFilter } from '../../src/common/filters/http-exception.filter';
import { PrismaService } from '../../src/common/prisma/prisma.service';

/**
 * Patient chart + clinical catalogs end-to-end over a real Postgres: the
 * pediatrician caseload grouped by family, per-child consultation history, the
 * autocomplete catalogs, and a coded medication round-trip (ATC stored in the
 * clear, name encrypted).
 */
describe('Patient chart & catalog (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const uniq = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  let parentToken: string;
  let pedToken: string;
  let serviceId: string;
  let childId: string;

  const http = () => request(app.getHttpServer());
  const auth = (t: string) => ({ Authorization: `Bearer ${t}` });
  const login = async (email: string, role: string) =>
    (await http().post('/api/auth/dev-login').send({ email, role }).expect(201)).body.accessToken;

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

    parentToken = await login(`pc-parent-${uniq}@e2e.test`, 'PARENT');
    pedToken = await login(`pc-ped-${uniq}@e2e.test`, 'PEDIATRICIAN');

    const pedUser = await prisma.user.findUniqueOrThrow({ where: { email: `pc-ped-${uniq}@e2e.test` } });
    const ped = await prisma.pediatrician.create({
      data: { userId: pedUser.id, licenseNumber: `LIC-${uniq}`, status: 'ACTIVE' },
    });
    const service = await prisma.pediatricianService.create({
      data: { pediatricianId: ped.id, type: 'MESSAGE', priceCents: 4500, slaHours: 24, active: true },
    });
    serviceId = service.id;

    const child = await http()
      .post('/api/children')
      .set(auth(parentToken))
      .send({ name: 'Rita Ficha', birthDate: '2022-09-01', healthDataConsent: true })
      .expect(201);
    childId = child.body.id;

    // A consultation gives the pediatrician access to the child + caseload.
    await http()
      .post('/api/consultations')
      .set(auth(parentToken))
      .send({ childId, serviceId, question: 'Tosse.' })
      .expect(201);
  });

  afterAll(async () => {
    await app?.close();
  });

  describe('catalogs', () => {
    it('searches medications by name (ATC coded)', async () => {
      const res = await http().get('/api/catalog/medications?q=amox').set(auth(pedToken)).expect(200);
      expect(res.body.some((m: { atc: string }) => m.atc === 'J01CA04')).toBe(true);
    });

    it('searches conditions accent-insensitively', async () => {
      const res = await http().get('/api/catalog/conditions?q=otite').set(auth(pedToken)).expect(200);
      expect(res.body.some((c: { icpc2: string }) => c.icpc2 === 'H71')).toBe(true);
    });

    it('suggests a weight-based dose (always flagged verify)', async () => {
      const res = await http().get('/api/catalog/dose?atc=N02BE01&weightKg=10').set(auth(pedToken)).expect(200);
      expect(res.body.found).toBe(true);
      expect(res.body.perDoseMg).toBe(150);
      expect(res.body.verify).toBe(true);
    });

    it('requires authentication', () => {
      return http().get('/api/catalog/medications?q=amox').expect(401);
    });
  });

  describe('caseload & history', () => {
    it('lists the pediatrician caseload grouped by family', async () => {
      const res = await http().get('/api/consultations/patients').set(auth(pedToken)).expect(200);
      const child = res.body.flatMap((f: { children: { id: string }[] }) => f.children).find(
        (c: { id: string }) => c.id === childId,
      );
      expect(child).toBeTruthy();
      expect(child.consultationCount).toBeGreaterThanOrEqual(1);
    });

    it('returns the per-child consultation history to the treating pediatrician', async () => {
      const res = await http()
        .get(`/api/consultations/child/${childId}/history`)
        .set(auth(pedToken))
        .expect(200);
      expect(res.body.child.name).toBe('Rita Ficha');
      expect(res.body.consultations.length).toBeGreaterThanOrEqual(1);
    });

    it('forbids a pediatrician with no consultation for the child (403)', async () => {
      const strangerPed = await login(`pc-stranger-${uniq}@e2e.test`, 'PEDIATRICIAN');
      await prisma.pediatrician.create({
        data: {
          userId: (await prisma.user.findUniqueOrThrow({ where: { email: `pc-stranger-${uniq}@e2e.test` } })).id,
          licenseNumber: `LIC2-${uniq}`,
          status: 'ACTIVE',
        },
      });
      await http()
        .get(`/api/consultations/child/${childId}/history`)
        .set(auth(strangerPed))
        .expect(403);
    });
  });

  describe('coded clinical entry round-trip', () => {
    it('stores the ATC code in the clear and the name encrypted', async () => {
      await http()
        .post(`/api/health-records/${childId}/medications`)
        .set(auth(parentToken))
        .send({ name: 'Amoxicilina', dose: '200 mg', atcCode: 'J01CA04' })
        .expect(201);

      const overview = await http()
        .get(`/api/health-records/${childId}`)
        .set(auth(parentToken))
        .expect(200);
      const med = overview.body.medications.find((m: { atcCode?: string }) => m.atcCode === 'J01CA04');
      expect(med).toBeTruthy();
      expect(med.name).toBe('Amoxicilina');

      const raw = await prisma.medication.findFirst({ where: { childId, atcCode: 'J01CA04' } });
      expect(raw).toBeTruthy();
      expect(raw!.atcCode).toBe('J01CA04'); // code queryable in the clear
      expect(String(raw!.name)).not.toContain('Amoxicilina'); // name encrypted
    });
  });
});
