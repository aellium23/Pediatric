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
 * Developmental milestones end-to-end.
 *
 * The two things worth proving over a real database: the age bands are worked
 * out from the child's actual birth date (a milestone list for the wrong age is
 * the failure mode that matters), and the response carries no score — the line
 * between a record and a screening test, and therefore between this product and
 * a medical device.
 */
describe('Development milestones flow (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const uniq = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  let token: string;
  let babyId: string; // ~3 months: nothing overdue yet
  let toddlerId: string; // ~2 years: several bands behind

  function http() {
    return request(app.getHttpServer());
  }
  async function login(email: string, role: string): Promise<string> {
    const res = await http().post('/api/auth/dev-login').send({ email, role }).expect(201);
    return res.body.accessToken;
  }
  const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });
  const monthsAgo = (n: number) => {
    const d = new Date();
    d.setMonth(d.getMonth() - n);
    return d.toISOString().slice(0, 10);
  };
  const addChild = async (name: string, birthDate: string) => {
    const res = await http()
      .post('/api/children')
      .set(bearer(token))
      .send({ name, birthDate, healthDataConsent: true })
      .expect(201);
    return res.body.id as string;
  };

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

    token = await login(`dev-parent-${uniq}@e2e.test`, 'PARENT');
    babyId = await addChild('Bebé Marcos', monthsAgo(3));
    toddlerId = await addChild('Tomás Marcos', monthsAgo(24));
  });

  afterAll(async () => {
    await app?.close();
  });

  describe('access control', () => {
    it('requires authentication (401)', () => {
      return http().get(`/api/health-records/${toddlerId}/development`).expect(401);
    });

    it("denies another family the child's milestones (403)", async () => {
      const other = await login(`dev-other-${uniq}@e2e.test`, 'PARENT');
      await http()
        .get(`/api/health-records/${toddlerId}/development`)
        .set(bearer(other))
        .expect(403);
    });

    it('is not a pediatrician’s to tick (403)', async () => {
      const ped = await login(`dev-ped-${uniq}@e2e.test`, 'PEDIATRICIAN');
      await http()
        .post(`/api/health-records/${toddlerId}/development`)
        .set(bearer(ped))
        .send({ code: 'm12-motor-1' })
        .expect(403);
    });
  });

  describe('the checklist', () => {
    it('works the age band out from the birth date', async () => {
      const baby = await http()
        .get(`/api/health-records/${babyId}/development`)
        .set(bearer(token))
        .expect(200);
      expect(baby.body.ageMonths).toBe(3);
      expect(baby.body.currentBand).toBe(2);

      const toddler = await http()
        .get(`/api/health-records/${toddlerId}/development`)
        .set(bearer(token))
        .expect(200);
      expect(toddler.body.ageMonths).toBe(24);
      expect(toddler.body.currentBand).toBe(24);
    });

    // A three-month-old is not late for anything. Prompting here would worry a
    // family whose baby is entirely on track.
    it('has nothing pending for a baby too young for a band to be overdue', async () => {
      const res = await http()
        .get(`/api/health-records/${babyId}/development`)
        .set(bearer(token))
        .expect(200);
      expect(res.body.pending).toEqual([]);
    });

    it('lists what is unticked from the bands a toddler is past', async () => {
      const res = await http()
        .get(`/api/health-records/${toddlerId}/development`)
        .set(bearer(token))
        .expect(200);
      expect(res.body.pending.length).toBeGreaterThan(0);
      // The band the child has only just reached is never in there.
      expect(res.body.pending.every((m: { months: number }) => m.months < 24)).toBe(true);
    });

    // The regulatory line, asserted over HTTP: no score, no proportion, no
    // severity, nothing a receiver could read as a screening result.
    it('answers with a checklist and never with a result', async () => {
      const res = await http()
        .get(`/api/health-records/${toddlerId}/development`)
        .set(bearer(token))
        .expect(200);
      expect(Object.keys(res.body).sort()).toEqual([
        'achieved',
        'ageMonths',
        'bands',
        'catalogue',
        'currentBand',
        'pending',
        'source',
      ]);
      const body = JSON.stringify(res.body).toLowerCase();
      for (const word of ['score', 'risco', 'risk', 'atraso', 'autis', 'diagn', 'percentil']) {
        expect(body).not.toContain(word);
      }
    });
  });

  describe('ticking a milestone', () => {
    it('records it and takes it out of pending', async () => {
      const code = 'm12-motor-1';
      await http()
        .post(`/api/health-records/${toddlerId}/development`)
        .set(bearer(token))
        .send({ code, achievedAt: monthsAgo(12), note: 'na sala, agarrado ao sofá' })
        .expect(201);

      const res = await http()
        .get(`/api/health-records/${toddlerId}/development`)
        .set(bearer(token))
        .expect(200);
      expect(res.body.achieved.some((a: { code: string }) => a.code === code)).toBe(true);
      expect(res.body.pending.some((m: { code: string }) => m.code === code)).toBe(false);
    });

    it('encrypts the parent’s note at rest and returns it readable', async () => {
      const row = await prisma.developmentMilestone.findFirstOrThrow({
        where: { childId: toddlerId, code: 'm12-motor-1' },
      });
      expect(row.note).not.toContain('sofá');
      const res = await http()
        .get(`/api/health-records/${toddlerId}/development`)
        .set(bearer(token))
        .expect(200);
      const hit = res.body.achieved.find((a: { code: string }) => a.code === 'm12-motor-1');
      expect(hit.note).toBe('na sala, agarrado ao sofá');
    });

    // A parent correcting a date should not create a second row for the same
    // milestone — one milestone, one truth.
    it('replaces rather than duplicates when the same milestone is ticked twice', async () => {
      await http()
        .post(`/api/health-records/${toddlerId}/development`)
        .set(bearer(token))
        .send({ code: 'm12-motor-1', achievedAt: monthsAgo(11) })
        .expect(201);
      const rows = await prisma.developmentMilestone.findMany({
        where: { childId: toddlerId, code: 'm12-motor-1' },
      });
      expect(rows).toHaveLength(1);
    });

    it('refuses a code that is not in the catalogue (400)', async () => {
      await http()
        .post(`/api/health-records/${toddlerId}/development`)
        .set(bearer(token))
        .send({ code: 'm12-motor-999' })
        .expect(400);
    });

    it('lets a parent untick one they ticked by mistake', async () => {
      await http()
        .post(`/api/health-records/${toddlerId}/development/m12-motor-1/remove`)
        .set(bearer(token))
        .expect(201);
      const res = await http()
        .get(`/api/health-records/${toddlerId}/development`)
        .set(bearer(token))
        .expect(200);
      expect(res.body.achieved.some((a: { code: string }) => a.code === 'm12-motor-1')).toBe(false);
    });
  });

  describe('the rest of the record', () => {
    it('puts the milestone on the timeline with the others', async () => {
      await http()
        .post(`/api/health-records/${toddlerId}/development`)
        .set(bearer(token))
        .send({ code: 'm12-linguagem-1', achievedAt: monthsAgo(12) })
        .expect(201);
      const res = await http()
        .get(`/api/health-records/${toddlerId}/timeline`)
        .set(bearer(token))
        .expect(200);
      const hit = res.body.events.find((e: { kind: string }) => e.kind === 'milestone');
      expect(hit).toBeTruthy();
      expect(hit.title).toContain('adeus');
    });

    it('carries it into the FHIR export as a survey Observation', async () => {
      const res = await http()
        .get(`/api/interop/fhir/${toddlerId}`)
        .set(bearer(token))
        .expect(200);
      const survey = res.body.entry
        .map((e: { resource: Record<string, unknown> }) => e.resource)
        .find(
          (r: Record<string, unknown>) =>
            r.resourceType === 'Observation' &&
            JSON.stringify(r.category).includes('survey'),
        );
      expect(survey).toBeTruthy();
      expect(survey.valueBoolean).toBe(true);
      expect(survey.code.coding[0].code).toBe('m12-linguagem-1');
    });
  });
});
