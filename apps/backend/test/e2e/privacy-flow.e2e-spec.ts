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
 * GDPR data-subject rights end-to-end over a real Postgres (CI service):
 * consent listing, access/portability export, consent revocation, and the
 * right to erasure (account anonymisation) — verifying the actual persisted
 * row state, not just the HTTP response.
 */
describe('Privacy / GDPR flow (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const uniq = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const parentEmail = `priv-${uniq}@e2e.test`;
  let token: string;
  let userId: string;

  function http() {
    return request(app.getHttpServer());
  }
  const auth = () => ({ Authorization: `Bearer ${token}` });

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

    const login = await http()
      .post('/api/auth/dev-login')
      .send({ email: parentEmail, role: 'PARENT' })
      .expect(201);
    token = login.body.accessToken;
    const u = await prisma.user.findUniqueOrThrow({ where: { email: parentEmail } });
    userId = u.id;

    // Create a child → records a HEALTH_DATA consent the rights flow will act on.
    await http()
      .post('/api/children')
      .set(auth())
      .send({ name: 'Inês Privacidade', birthDate: '2023-01-15', healthDataConsent: true })
      .expect(201);
  });

  afterAll(async () => {
    await app?.close();
  });

  it('requires authentication for the export endpoint (401)', () => {
    return http().get('/api/privacy/export').expect(401);
  });

  it('lists the health-data consent recorded at child creation', async () => {
    const res = await http().get('/api/privacy/consents').set(auth()).expect(200);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    expect(res.body.some((c: { subject: string }) => c.subject === 'HEALTH_DATA')).toBe(true);
  });

  it('exports a portable copy including the account and the child', async () => {
    const res = await http().get('/api/privacy/export').set(auth()).expect(200);
    expect(res.body.account.email).toBe(parentEmail);
    expect(res.body.children.some((c: { name: string }) => c.name === 'Inês Privacidade')).toBe(true);
    expect(res.body.consents.length).toBeGreaterThanOrEqual(1);
    expect(res.body.exportedAt).toBeTruthy();
  });

  it('revokes a consent and reflects revokedAt', async () => {
    const consents = await http().get('/api/privacy/consents').set(auth()).expect(200);
    const id = consents.body[0].id;
    await http().post(`/api/privacy/consents/${id}/revoke`).set(auth()).expect(201);
    const row = await prisma.consent.findUnique({ where: { id } });
    expect(row!.revokedAt).toBeTruthy();
  });

  it('erases the account: anonymises identifiers and retains an audit-safe shell', async () => {
    await http().post('/api/privacy/delete-account').set(auth()).expect(201);
    const row = await prisma.user.findUnique({ where: { id: userId } });
    expect(row).toBeTruthy(); // row kept (legal/audit), but identity stripped
    expect(row!.email).toBeNull();
    expect(row!.phone).toBeNull();
    expect(row!.appleSub).toBeNull();
    expect(row!.googleSub).toBeNull();
    expect(row!.status).toBe('deleted');
    // All remaining consents are revoked as part of erasure.
    const live = await prisma.consent.count({ where: { userId, revokedAt: null } });
    expect(live).toBe(0);
  });
});
