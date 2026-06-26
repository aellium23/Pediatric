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
 * Full-stack integration over a real Postgres (the CI service): exercises the
 * production wiring end-to-end — JWT guard, RBAC (@Roles), the global
 * ValidationPipe (whitelist + forbidNonWhitelisted), the exception filter,
 * Prisma writes, AES-256-GCM field encryption, and consent recording — none of
 * which the unit suite covers together.
 */
describe('Children flow (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const uniq = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const parentEmail = `parent-${uniq}@e2e.test`;
  const pedEmail = `ped-${uniq}@e2e.test`;
  let parentToken: string;
  let pedToken: string;

  async function login(email: string, role?: string): Promise<string> {
    const res = await request(app.getHttpServer())
      .post('/api/auth/dev-login')
      .send({ email, ...(role ? { role } : {}) })
      .expect(201);
    expect(res.body.accessToken).toBeTruthy();
    return res.body.accessToken;
  }

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
  });

  afterAll(async () => {
    await app?.close();
  });

  const validChild = {
    name: 'Tomás Teste',
    birthDate: '2021-05-10',
    sex: 'M',
    allergies: ['penicilina'],
    healthDataConsent: true,
  };

  describe('auth & RBAC', () => {
    it('rejects an unauthenticated request with 401', () => {
      return request(app.getHttpServer()).post('/api/children').send(validChild).expect(401);
    });

    it('forbids a pediatrician from the parent-only children endpoint (403)', () => {
      return request(app.getHttpServer())
        .post('/api/children')
        .set('Authorization', `Bearer ${pedToken}`)
        .send(validChild)
        .expect(403);
    });
  });

  describe('validation & consent gates', () => {
    it('rejects a missing required field with 400', () => {
      return request(app.getHttpServer())
        .post('/api/children')
        .set('Authorization', `Bearer ${parentToken}`)
        .send({ birthDate: '2021-05-10', healthDataConsent: true })
        .expect(400);
    });

    it('rejects unknown fields (forbidNonWhitelisted) with 400', () => {
      return request(app.getHttpServer())
        .post('/api/children')
        .set('Authorization', `Bearer ${parentToken}`)
        .send({ ...validChild, hackerField: 'x' })
        .expect(400);
    });

    it('blocks child creation without explicit health-data consent (403)', () => {
      return request(app.getHttpServer())
        .post('/api/children')
        .set('Authorization', `Bearer ${parentToken}`)
        .send({ ...validChild, healthDataConsent: false })
        .expect(403);
    });
  });

  describe('happy path with field encryption', () => {
    let childId: string;

    it('creates a child and returns the decrypted health profile', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/children')
        .set('Authorization', `Bearer ${parentToken}`)
        .send(validChild)
        .expect(201);
      expect(res.body.name).toBe('Tomás Teste');
      expect(res.body.health.allergies).toEqual(['penicilina']);
      childId = res.body.id;
      expect(childId).toBeTruthy();
    });

    it('persists the health profile ENCRYPTED at rest (not plaintext)', async () => {
      const row = await prisma.child.findUnique({ where: { id: childId } });
      expect(row).toBeTruthy();
      // The raw column must not contain the plaintext allergy.
      expect(row!.healthProfile).toBeTruthy();
      expect(String(row!.healthProfile)).not.toContain('penicilina');
    });

    it('records immutable health-data consent for the child', async () => {
      const consents = await prisma.consent.findMany({ where: { childId } });
      expect(consents.length).toBeGreaterThanOrEqual(1);
      expect(consents[0].subject).toBe('HEALTH_DATA');
    });

    it('lists the child for its owner with the profile round-tripped', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/children')
        .set('Authorization', `Bearer ${parentToken}`)
        .expect(200);
      const found = res.body.find((c: { id: string }) => c.id === childId);
      expect(found).toBeTruthy();
      expect(found.health.allergies).toEqual(['penicilina']);
    });

    it("denies another parent access to someone else's child (403)", async () => {
      const otherToken = await login(`other-${uniq}@e2e.test`, 'PARENT');
      await request(app.getHttpServer())
        .get(`/api/children/${childId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(403);
    });
  });

  describe('refresh-token rotation', () => {
    it('rotates a refresh token and rejects its reuse', async () => {
      const login1 = await request(app.getHttpServer())
        .post('/api/auth/dev-login')
        .send({ email: parentEmail, role: 'PARENT' })
        .expect(201);
      const oldRefresh = login1.body.refreshToken;

      const rotated = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken: oldRefresh })
        .expect(201);
      expect(rotated.body.accessToken).toBeTruthy();

      // Reusing the now-revoked token must fail.
      await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken: oldRefresh })
        .expect(401);
    });
  });
});
