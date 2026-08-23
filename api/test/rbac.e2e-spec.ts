/**
 * Stage 11 hardening — systematic RBAC wrong-role audit.
 *
 * For every write endpoint that has a @Roles() guard, at least one
 * "wrong-role caller → 403" case is included here, supplementing the
 * per-feature specs that already exercise the happy paths. The goal is
 * to prove that the guard *actually rejects* the wrong caller, not just
 * that the guard decorator is present in source (a typo in the role name
 * would pass a source-code scan but fail here).
 *
 * Deliberately uses only seeded, long-lived accounts (no beforeAll data
 * creation) so there's nothing to clean up — every test asserts 401/403
 * before any DB write reaches the handler.
 */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

const PASSWORD = 'Password123!';
const SEEDS = {
  ADMIN: 'admin@demoschool.ng',
  BURSAR: 'bursar@demoschool.ng',
  EXAM_OFFICER: 'examofficer@demoschool.ng',
  TEACHER: 'tunde.bakare@demoschool.ng',
};

describe('RBAC wrong-role enforcement (Stage 11 hardening)', () => {
  let app: INestApplication<App>;

  let adminToken: string;
  let bursarToken: string;
  let examOfficerToken: string;
  let teacherToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    async function token(email: string): Promise<string> {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password: PASSWORD });
      return (res.body as { accessToken: string }).accessToken;
    }

    [adminToken, bursarToken, examOfficerToken, teacherToken] =
      await Promise.all([
        token(SEEDS.ADMIN),
        token(SEEDS.BURSAR),
        token(SEEDS.EXAM_OFFICER),
        token(SEEDS.TEACHER),
      ]);
  });

  afterAll(async () => {
    await app.close();
  });

  function as(tok: string) {
    return { Authorization: `Bearer ${tok}` };
  }

  // ------------------------------------------------------------------
  // School / Settings module (@Roles('ADMIN') writes)
  // ------------------------------------------------------------------
  describe('School settings — ADMIN-only writes', () => {
    it('PATCH /school — Bursar gets 403', async () => {
      await request(app.getHttpServer())
        .patch('/school')
        .set(as(bursarToken))
        .send({ name: 'Hack School' })
        .expect(403);
    });
    it('PATCH /school/grading-scale — Teacher gets 403', async () => {
      await request(app.getHttpServer())
        .patch('/school/grading-scale')
        .set(as(teacherToken))
        .send({ scale: [] })
        .expect(403);
    });
    it('POST /school/logo — Exam Officer gets 403', async () => {
      await request(app.getHttpServer())
        .post('/school/logo')
        .set(as(examOfficerToken))
        .attach('logo', Buffer.from('fake'), 'logo.png')
        .expect(403);
    });
  });

  // ------------------------------------------------------------------
  // Students module (@Roles('ADMIN') writes)
  // ------------------------------------------------------------------
  describe('Students — ADMIN-only writes', () => {
    it('POST /students — Teacher gets 403', async () => {
      await request(app.getHttpServer())
        .post('/students')
        .set(as(teacherToken))
        .send({ firstName: 'X', lastName: 'Y', dateOfBirth: '2010-01-01', gender: 'MALE' })
        .expect(403);
    });
    it('PATCH /students/:id — Bursar gets 403', async () => {
      await request(app.getHttpServer())
        .patch('/students/nonexistent-id')
        .set(as(bursarToken))
        .send({ firstName: 'Hacked' })
        .expect(403);
    });
    it('DELETE /students/:id — Exam Officer gets 403', async () => {
      await request(app.getHttpServer())
        .delete('/students/nonexistent-id')
        .set(as(examOfficerToken))
        .expect(403);
    });
    it('POST /students/:id/guardians — Teacher gets 403', async () => {
      await request(app.getHttpServer())
        .post('/students/nonexistent-id/guardians')
        .set(as(teacherToken))
        .send({ firstName: 'G', lastName: 'H', email: 'g@example.com', phone: '+2348000000000', relationship: 'Father' })
        .expect(403);
    });
  });

  // ------------------------------------------------------------------
  // Staff module (@Roles('ADMIN') writes; @Roles('ADMIN','HR_OFFICER') for some)
  // ------------------------------------------------------------------
  describe('Staff — restricted writes', () => {
    it('POST /staff (create staff) — Bursar gets 403', async () => {
      await request(app.getHttpServer())
        .post('/staff')
        .set(as(bursarToken))
        .send({ firstName: 'X', lastName: 'Y', email: 'x@test.ng', roles: ['SUBJECT_TEACHER'] })
        .expect(403);
    });
    it('POST /staff (create staff) — Teacher gets 403', async () => {
      await request(app.getHttpServer())
        .post('/staff')
        .set(as(teacherToken))
        .send({ firstName: 'X', lastName: 'Y', email: 'x2@test.ng', roles: ['SUBJECT_TEACHER'] })
        .expect(403);
    });
    it('POST /staff/:id/roles (assign role) — Teacher gets 403', async () => {
      await request(app.getHttpServer())
        .post('/staff/nonexistent-id/roles')
        .set(as(teacherToken))
        .send({ role: 'ADMIN' })
        .expect(403);
    });
  });

  // ------------------------------------------------------------------
  // Academic setup — classes/subjects/sessions (@Roles('ADMIN') writes)
  // ------------------------------------------------------------------
  describe('Academic setup — ADMIN-only writes', () => {
    it('POST /classes — Bursar gets 403', async () => {
      await request(app.getHttpServer())
        .post('/classes')
        .set(as(bursarToken))
        .send({ name: 'JSS0', level: 0 })
        .expect(403);
    });
    it('POST /subjects — Teacher gets 403', async () => {
      await request(app.getHttpServer())
        .post('/subjects')
        .set(as(teacherToken))
        .send({ name: 'Hack Subject', code: 'HK' })
        .expect(403);
    });
    it('POST /academic-sessions — Bursar gets 403', async () => {
      await request(app.getHttpServer())
        .post('/academic-sessions')
        .set(as(bursarToken))
        .send({ name: '2099/2100', startDate: '2099-01-01', endDate: '2100-01-01' })
        .expect(403);
    });
  });

  // ------------------------------------------------------------------
  // Assessment components (@Roles('ADMIN', 'EXAM_OFFICER') writes)
  // ------------------------------------------------------------------
  describe('Assessment components — ADMIN or Exam Officer only', () => {
    it('POST /assessment-components — Bursar gets 403', async () => {
      await request(app.getHttpServer())
        .post('/assessment-components')
        .set(as(bursarToken))
        .send({ name: 'CA1', maxScore: 30, weight: 30, termId: 'fake' })
        .expect(403);
    });
    it('POST /assessment-components — Teacher gets 403', async () => {
      await request(app.getHttpServer())
        .post('/assessment-components')
        .set(as(teacherToken))
        .send({ name: 'CA2', maxScore: 30, weight: 30, termId: 'fake' })
        .expect(403);
    });
  });

  // ------------------------------------------------------------------
  // Score submission (@Roles('SUBJECT_TEACHER') for submit)
  // ------------------------------------------------------------------
  describe('Score submission — Subject Teacher only', () => {
    it('POST /scores/submit — Bursar gets 403', async () => {
      await request(app.getHttpServer())
        .post('/scores/submit')
        .set(as(bursarToken))
        .send({ classSubjectId: 'fake', termId: 'fake', entries: [] })
        .expect(403);
    });
    it('POST /scores/submit — Admin gets 403 (admin unlocks, not directly submits)', async () => {
      // Admin has @Roles('ADMIN','EXAM_OFFICER') on the UNLOCK endpoint, but
      // score *submission* itself is SUBJECT_TEACHER only — this proves the
      // distinction is enforced.
      await request(app.getHttpServer())
        .post('/scores/submit')
        .set(as(adminToken))
        .send({ classSubjectId: 'fake', termId: 'fake', entries: [] })
        .expect(403);
    });
    it('POST /scores/unlock — Teacher gets 403 (unlock is ADMIN/EXAM_OFFICER only)', async () => {
      await request(app.getHttpServer())
        .post('/scores/unlock')
        .set(as(teacherToken))
        .send({ classSubjectId: 'fake', termId: 'fake', reason: 'test' })
        .expect(403);
    });
  });

  // ------------------------------------------------------------------
  // Result approval workflow
  // ------------------------------------------------------------------
  describe('Results — role-gated approval steps', () => {
    it('POST /.../approve — Bursar gets 403', async () => {
      await request(app.getHttpServer())
        .post('/results/fake-arm/fake-term/approve')
        .set(as(bursarToken))
        .expect(403);
    });
    it('POST /.../publish — Teacher gets 403', async () => {
      await request(app.getHttpServer())
        .post('/results/fake-arm/fake-term/publish')
        .set(as(teacherToken))
        .expect(403);
    });
    it('POST /.../generate-report-cards — Bursar gets 403', async () => {
      await request(app.getHttpServer())
        .post('/results/fake-arm/fake-term/generate-report-cards')
        .set(as(bursarToken))
        .expect(403);
    });
  });

  // ------------------------------------------------------------------
  // Fees & Invoicing
  // ------------------------------------------------------------------
  describe('Fee structures — Bursar-only writes', () => {
    it('POST /fee-structures — Teacher gets 403', async () => {
      await request(app.getHttpServer())
        .post('/fee-structures')
        .set(as(teacherToken))
        .send({ name: 'Term Fees', termId: 'fake' })
        .expect(403);
    });
    it('POST /fee-structures/:id/components — Exam Officer gets 403', async () => {
      await request(app.getHttpServer())
        .post('/fee-structures/nonexistent/components')
        .set(as(examOfficerToken))
        .send({ name: 'Tuition', amount: 50000, type: 'RECURRING' })
        .expect(403);
    });
    it('POST /invoices/generate — Teacher gets 403', async () => {
      await request(app.getHttpServer())
        .post('/invoices/generate')
        .set(as(teacherToken))
        .send({ feeStructureId: 'fake', classArmId: 'fake' })
        .expect(403);
    });
  });

  // ------------------------------------------------------------------
  // Promotion
  // ------------------------------------------------------------------
  describe('Promotion — ADMIN-only', () => {
    it('POST /students/:id/promote — Bursar gets 403', async () => {
      await request(app.getHttpServer())
        .post('/students/nonexistent/promote')
        .set(as(bursarToken))
        .send({ outcome: 'PROMOTED', targetClassId: 'fake', targetArmId: 'fake', targetSessionId: 'fake' })
        .expect(403);
    });
    it('POST /sessions/:id/promotion-suggestions — Teacher gets 403', async () => {
      await request(app.getHttpServer())
        .post('/sessions/nonexistent/promotion-suggestions')
        .set(as(teacherToken))
        .expect(403);
    });
  });

  // ------------------------------------------------------------------
  // Health/detailed — ADMIN-only
  // ------------------------------------------------------------------
  describe('Health/detailed — ADMIN-only', () => {
    it('GET /health/detailed — Bursar gets 403', async () => {
      await request(app.getHttpServer())
        .get('/health/detailed')
        .set(as(bursarToken))
        .expect(403);
    });
    it('GET /health/detailed — Teacher gets 403', async () => {
      await request(app.getHttpServer())
        .get('/health/detailed')
        .set(as(teacherToken))
        .expect(403);
    });
    it('GET /health/detailed — Exam Officer gets 403', async () => {
      await request(app.getHttpServer())
        .get('/health/detailed')
        .set(as(examOfficerToken))
        .expect(403);
    });
  });

  // ------------------------------------------------------------------
  // Unauthenticated access → 401 (guard fires before role check)
  // ------------------------------------------------------------------
  describe('Unauthenticated callers — 401 before role check', () => {
    it('POST /students — no token gets 401', async () => {
      await request(app.getHttpServer())
        .post('/students')
        .send({ firstName: 'X', lastName: 'Y', dateOfBirth: '2010-01-01', gender: 'MALE' })
        .expect(401);
    });
    it('PATCH /school — no token gets 401', async () => {
      await request(app.getHttpServer()).patch('/school').send({ name: 'Hack' }).expect(401);
    });
    it('GET /health/detailed — no token gets 401', async () => {
      await request(app.getHttpServer()).get('/health/detailed').expect(401);
    });
  });
});
