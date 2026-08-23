import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';

const PASSWORD = 'Password123!';
const ADMIN_EMAIL = 'admin@demoschool.ng';
const RUN_ID = Date.now().toString(36);

interface IdResponse {
  id: string;
}

interface TermResponse extends IdResponse {
  name: string;
}

interface SessionResponse extends IdResponse {
  terms: TermResponse[];
}

interface EnrollmentResponse {
  id: string;
  status: string;
  classId: string;
  armId: string;
  termId: string;
}

interface PromotionSuggestionResponse {
  studentId: string;
  currentEnrollmentId: string;
  overallAverage: number | null;
  suggestedOutcome: string | null;
  reason: string;
}

interface TranscriptResponse {
  student: { firstName: string; lastName: string };
  terms: {
    termName: string;
    overallAverage: number | null;
    subjects: unknown[];
  }[];
}

describe('Promotion & Transcript (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let adminToken: string;

  let sessionId: string;
  let nextSessionId: string;
  let term1Id: string;
  let term2Id: string;
  let classAId: string;
  let armAId: string;
  let classBId: string;
  let armBId: string;

  const studentIds: string[] = [];
  let passingStudentId: string;
  let failingStudentId: string;
  let passingEnrollmentId: string;
  let failingEnrollmentId: string;

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
    prisma = moduleFixture.get(PrismaService);

    const server = app.getHttpServer();
    adminToken = await loginAndGetToken(ADMIN_EMAIL);

    // Two separate, fully isolated sessions — suggestPromotions evaluates
    // a session's chronologically *last* term, so the "ending" session
    // below has exactly one term (trivially also its last), and the
    // promotion target lives in a wholly separate, later session. Putting
    // both terms in one session would make the later one "last" instead
    // of the one actually holding the students' results.
    const endingSessionRes = await request(server)
      .post('/academic-sessions')
      .set(asAdmin())
      .send({
        name: `Promo-Ending-${RUN_ID}`,
        terms: [
          { name: 'Term1', startDate: '2099-09-01', endDate: '2099-12-01' },
        ],
      })
      .expect(201);
    const endingSession = endingSessionRes.body as SessionResponse;
    sessionId = endingSession.id;
    term1Id = endingSession.terms[0].id;

    const nextSessionRes = await request(server)
      .post('/academic-sessions')
      .set(asAdmin())
      .send({
        name: `Promo-Next-${RUN_ID}`,
        terms: [
          { name: 'Term1', startDate: '2100-09-01', endDate: '2100-12-01' },
        ],
      })
      .expect(201);
    const nextSession = nextSessionRes.body as SessionResponse;
    nextSessionId = nextSession.id;
    term2Id = nextSession.terms[0].id;

    classAId = (
      (
        await request(server)
          .post('/classes')
          .set(asAdmin())
          .send({ name: `PromoA-${RUN_ID}`, level: 60 })
          .expect(201)
      ).body as IdResponse
    ).id;
    armAId = (
      (
        await request(server)
          .post(`/classes/${classAId}/arms`)
          .set(asAdmin())
          .send({ name: 'A' })
          .expect(201)
      ).body as IdResponse
    ).id;
    classBId = (
      (
        await request(server)
          .post('/classes')
          .set(asAdmin())
          .send({ name: `PromoB-${RUN_ID}`, level: 61 })
          .expect(201)
      ).body as IdResponse
    ).id;
    armBId = (
      (
        await request(server)
          .post(`/classes/${classBId}/arms`)
          .set(asAdmin())
          .send({ name: 'B' })
          .expect(201)
      ).body as IdResponse
    ).id;

    // Two students in classA/term1: one with a passing StudentTermResult,
    // one failing — enough to exercise both suggestion branches.
    for (const label of ['Passing', 'Failing']) {
      const student = await request(server)
        .post('/students')
        .set(asAdmin())
        .send({
          firstName: label,
          lastName: `Student${RUN_ID}`,
          dateOfBirth: '2012-01-01',
          gender: 'FEMALE',
        })
        .expect(201);
      const studentId = (student.body as IdResponse).id;
      studentIds.push(studentId);
      const enrollment = await request(server)
        .post(`/students/${studentId}/enrollments`)
        .set(asAdmin())
        .send({ classId: classAId, armId: armAId, termId: term1Id })
        .expect(201);
      const enrollmentId = (enrollment.body as IdResponse).id;
      if (label === 'Passing') {
        passingStudentId = studentId;
        passingEnrollmentId = enrollmentId;
      } else {
        failingStudentId = studentId;
        failingEnrollmentId = enrollmentId;
      }
    }

    // StudentTermResult rows are normally produced by collation — written
    // directly here since this suite is testing promotion/transcript
    // logic, not the collation pipeline itself (already covered by
    // results.e2e-spec.ts).
    await prisma.studentTermResult.create({
      data: {
        studentId: passingStudentId,
        termId: term1Id,
        armId: armAId,
        overallAverage: 72.5,
        overallPosition: 1,
        classSize: 2,
      },
    });
    await prisma.studentTermResult.create({
      data: {
        studentId: failingStudentId,
        termId: term1Id,
        armId: armAId,
        overallAverage: 30,
        overallPosition: 2,
        classSize: 2,
      },
    });
  });

  afterAll(async () => {
    await prisma.studentTermResult
      .deleteMany({ where: { studentId: { in: studentIds } } })
      .catch(() => undefined);
    await prisma.enrollment
      .deleteMany({ where: { studentId: { in: studentIds } } })
      .catch(() => undefined);
    await prisma.refreshToken
      .deleteMany({ where: { studentId: { in: studentIds } } })
      .catch(() => undefined);
    await prisma.student
      .deleteMany({ where: { id: { in: studentIds } } })
      .catch(() => undefined);
    await prisma.arm.delete({ where: { id: armAId } }).catch(() => undefined);
    await prisma.arm.delete({ where: { id: armBId } }).catch(() => undefined);
    await prisma.class
      .delete({ where: { id: classAId } })
      .catch(() => undefined);
    await prisma.class
      .delete({ where: { id: classBId } })
      .catch(() => undefined);
    // Guarded — either id undefined (an earlier beforeAll step never
    // reached its assignment) would make that delete's `where` collapse
    // to `{}` and wipe every Term in the database school-wide.
    if (sessionId) {
      await prisma.term
        .deleteMany({ where: { sessionId } })
        .catch(() => undefined);
    }
    if (nextSessionId) {
      await prisma.term
        .deleteMany({ where: { sessionId: nextSessionId } })
        .catch(() => undefined);
    }
    await prisma.academicSession
      .delete({ where: { id: sessionId } })
      .catch(() => undefined);
    await prisma.academicSession
      .delete({ where: { id: nextSessionId } })
      .catch(() => undefined);
    await app.close();
  });

  async function loginAndGetToken(email: string): Promise<string> {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: PASSWORD });
    return (res.body as { accessToken: string }).accessToken;
  }
  function asAdmin() {
    return { Authorization: `Bearer ${adminToken}` };
  }

  describe('POST /sessions/:id/promotion-suggestions', () => {
    it('suggests PROMOTED above threshold and REPEATED below it, with a clear reason', async () => {
      const res = await request(app.getHttpServer())
        .post(`/sessions/${sessionId}/promotion-suggestions`)
        .set(asAdmin())
        .send({ threshold: 40 })
        .expect(201);
      const suggestions = res.body as PromotionSuggestionResponse[];

      const passing = suggestions.find((s) => s.studentId === passingStudentId);
      const failing = suggestions.find((s) => s.studentId === failingStudentId);
      expect(passing?.suggestedOutcome).toBe('PROMOTED');
      expect(passing?.reason).toMatch(/meets the 40% threshold/);
      expect(failing?.suggestedOutcome).toBe('REPEATED');
      expect(failing?.reason).toMatch(/below the 40% threshold/);
    });

    it('respects a custom threshold', async () => {
      const res = await request(app.getHttpServer())
        .post(`/sessions/${sessionId}/promotion-suggestions`)
        .set(asAdmin())
        .send({ threshold: 80 })
        .expect(201);
      const suggestions = res.body as PromotionSuggestionResponse[];
      const passing = suggestions.find((s) => s.studentId === passingStudentId);
      // 72.5% no longer clears an 80% bar.
      expect(passing?.suggestedOutcome).toBe('REPEATED');
    });

    it('rejects a non-admin caller', async () => {
      const bursarToken = await loginAndGetToken('bursar@demoschool.ng');
      await request(app.getHttpServer())
        .post(`/sessions/${sessionId}/promotion-suggestions`)
        .set({ Authorization: `Bearer ${bursarToken}` })
        .send({})
        .expect(403);
    });
  });

  describe('POST /students/:id/promote', () => {
    it('rejects PROMOTED/REPEATED without the next class/arm/term', async () => {
      await request(app.getHttpServer())
        .post(`/students/${passingStudentId}/promote`)
        .set(asAdmin())
        .send({ currentEnrollmentId: passingEnrollmentId, outcome: 'PROMOTED' })
        .expect(400);

      // The rejection must be purely a validation failure — the original
      // enrollment is untouched, still ACTIVE.
      const enrollment = await prisma.enrollment.findUniqueOrThrow({
        where: { id: passingEnrollmentId },
      });
      expect(enrollment.status).toBe('ACTIVE');
    });

    it('rolls back the status change if creating the new enrollment fails, instead of leaving the student with none active', async () => {
      // armBId belongs to classBId, not classAId — createEnrollment's own
      // "armId must belong to classId" check will reject this combination,
      // simulating any downstream failure after the status change.
      await request(app.getHttpServer())
        .post(`/students/${failingStudentId}/promote`)
        .set(asAdmin())
        .send({
          currentEnrollmentId: failingEnrollmentId,
          outcome: 'REPEATED',
          nextClassId: classAId,
          nextArmId: armBId,
          nextTermId: term2Id,
        })
        .expect(400);

      const enrollment = await prisma.enrollment.findUniqueOrThrow({
        where: { id: failingEnrollmentId },
      });
      expect(enrollment.status).toBe('ACTIVE');
      const newEnrollments = await prisma.enrollment.count({
        where: { studentId: failingStudentId, termId: term2Id },
      });
      expect(newEnrollments).toBe(0);
    });

    it('promotes a student into a new class/arm/term, closing out the old enrollment', async () => {
      const res = await request(app.getHttpServer())
        .post(`/students/${passingStudentId}/promote`)
        .set(asAdmin())
        .send({
          currentEnrollmentId: passingEnrollmentId,
          outcome: 'PROMOTED',
          nextClassId: classBId,
          nextArmId: armBId,
          nextTermId: term2Id,
        })
        .expect(201);
      const newEnrollment = res.body as EnrollmentResponse;
      expect(newEnrollment.status).toBe('ACTIVE');
      expect(newEnrollment.classId).toBe(classBId);
      expect(newEnrollment.armId).toBe(armBId);

      const oldEnrollment = await prisma.enrollment.findUniqueOrThrow({
        where: { id: passingEnrollmentId },
      });
      expect(oldEnrollment.status).toBe('PROMOTED');

      const auditRow = await prisma.auditLog.findFirst({
        where: { action: 'STUDENT_PROMOTED', entityId: passingStudentId },
        orderBy: { createdAt: 'desc' },
      });
      expect(auditRow).toBeTruthy();
    });

    it('withdraws a student with no next enrollment required', async () => {
      const res = await request(app.getHttpServer())
        .post(`/students/${failingStudentId}/promote`)
        .set(asAdmin())
        .send({
          currentEnrollmentId: failingEnrollmentId,
          outcome: 'WITHDRAWN',
        })
        .expect(201);
      expect((res.body as EnrollmentResponse).status).toBe('WITHDRAWN');
    });
  });

  describe('GET /students/:id/transcript', () => {
    it('lets a privileged staff role see the full multi-term history', async () => {
      const res = await request(app.getHttpServer())
        .get(`/students/${passingStudentId}/transcript`)
        .set(asAdmin())
        .expect(200);
      const transcript = res.body as TranscriptResponse;
      expect(transcript.terms.length).toBeGreaterThanOrEqual(2);
      const term1Entry = transcript.terms.find((t) => t.termName === 'Term1');
      expect(term1Entry?.overallAverage).toBe(72.5);
    });

    it('rejects an unrelated staff role with no access (e.g. Bursar) only if not otherwise privileged — sanity check via a non-privileged, non-self caller', async () => {
      // A second student stands in for "some other student" trying to view
      // someone else's transcript via the STUDENT role path.
      const otherStudentEmail = `other.${RUN_ID}@students.demoschool.ng`;
      await prisma.student.update({
        where: { id: failingStudentId },
        data: {
          email: otherStudentEmail,
          passwordHash: await bcrypt.hash(PASSWORD, 10),
        },
      });
      const otherStudentToken = await loginAndGetToken(otherStudentEmail);
      await request(app.getHttpServer())
        .get(`/students/${passingStudentId}/transcript`)
        .set({ Authorization: `Bearer ${otherStudentToken}` })
        .expect(403);
    });
  });
});
