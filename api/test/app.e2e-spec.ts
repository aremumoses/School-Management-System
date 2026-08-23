import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

interface QueueHealth {
  name: string;
  waiting: number;
  active: number;
  failed: number;
  delayed: number;
  lastCompletedAt: string | null;
}

describe('Health (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/health (GET) reports connected database and Redis, with no auth required', async () => {
    const res = await request(app.getHttpServer()).get('/health').expect(200);
    expect(res.body).toEqual({
      status: 'ok',
      db: 'connected',
      redis: 'connected',
    });
  });

  describe('/health/detailed (GET) — Stage 11 hardening', () => {
    it('rejects an unauthenticated request', async () => {
      await request(app.getHttpServer()).get('/health/detailed').expect(401);
    });

    it('rejects a non-Admin caller', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'bursar@demoschool.ng', password: 'Password123!' });
      const token = (res.body as { accessToken: string }).accessToken;

      await request(app.getHttpServer())
        .get('/health/detailed')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    it('reports per-queue depth and last-completed-job timestamp for an Admin caller', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@demoschool.ng', password: 'Password123!' });
      const token = (res.body as { accessToken: string }).accessToken;

      const detailed = await request(app.getHttpServer())
        .get('/health/detailed')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const queues = (detailed.body as { queues: QueueHealth[] }).queues;
      expect(queues.map((q) => q.name).sort()).toEqual([
        'documents',
        'receipts',
        'report-cards',
      ]);
      for (const queue of queues) {
        expect(typeof queue.waiting).toBe('number');
        expect(typeof queue.active).toBe('number');
        expect(typeof queue.failed).toBe('number');
        expect(typeof queue.delayed).toBe('number');
      }
    });
  });
});
