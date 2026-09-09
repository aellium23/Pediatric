import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { HealthController } from '../../src/modules/health/health.module';
import { PrismaService } from '../../src/common/prisma/prisma.service';

describe('Health (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      // Stub Prisma so the e2e does not need a live DB for liveness.
      providers: [
        { provide: PrismaService, useValue: { $queryRaw: async () => [{ '?column?': 1 }] } },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health → 200 ok', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect({ status: 'ok' });
  });

  it('GET /health/ready → 200 with db up', () => {
    return request(app.getHttpServer())
      .get('/health/ready')
      .expect(200)
      .expect({ status: 'ok', db: 'up' });
  });
});
