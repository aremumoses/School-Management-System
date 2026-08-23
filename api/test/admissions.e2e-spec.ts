import { createHmac } from 'node:crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
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

interface ApplicantResponse {
  id: string;
  firstName: string;
  lastName: string;
  status: string;
  applicationFeePaid: boolean;
  offerLetterUrl: string | null;
  convertedStudentId: string | null;
}

function signPaystackPayload(payload: object, secretKey: string) {
  const rawBody = Buffer.from(JSON.stringify(payload), 'utf8');
  const signature = createHmac('sha512', secretKey)
    .update(rawBody)
    .digest('hex');
  return { rawBody, signature };
}

describe('Admissions (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let adminToken: string;
  let vpToken: string;
  let teacherToken: string;
  let paystackSecretKey: string;

  let classId: string;
  let armId: string;
  let applicantId: string;
  let convertedStudentId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    // rawBody: true required for /webhooks/paystack signature verification
    app = moduleFixture.createNestApplication({ rawBody: true });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    prisma = moduleFixture.get(PrismaService);
    // Read AFTER app.init() — ConfigModule's dotenv loading is what
    // populates process.env, so reading before init() gives an empty string.
    paystackSecretKey = process.env.PAYSTACK_SECRET_KEY!;
    if (!paystackSecretKey) {
      throw new Error(
        'PAYSTACK_SECRET_KEY is not set — required for the webhook tests in this file',
      );
    }

    async function tok(email: string) {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password: PASSWORD });
      return (res.body as { accessToken: string }).accessToken;
    }
    [adminToken, vpToken, teacherToken] = await Promise.all([
      tok(ADMIN_EMAIL),
      tok('vp@demoschool.ng'),
      tok('tunde.bakare@demoschool.ng'),
    ]);

    // Pick the first available class/arm from seeded data
    const classes = (
      await request(app.getHttpServer())
        .get('/classes')
        .set('Authorization', `Bearer ${adminToken}`)
    ).body as Array<{ id: string; arms: Array<{ id: string }> }>;
    classId = classes[0].id;
    armId = classes[0].arms[0].id;

    // Ensure application fee is configured for fee-payment tests
    await request(app.getHttpServer())
      .patch('/school')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ applicationFeeAmount: 5000 });
  });

  afterAll(async () => {
    // Clean up created test data (append-only policy doesn't apply to test
    // applicants — they're entirely test scaffolding, not production records)
    if (convertedStudentId) {
      const guardians = await prisma.studentGuardian.findMany({
        where: { studentId: convertedStudentId },
      });
      await prisma.refreshToken
        .deleteMany({ where: { studentId: convertedStudentId } })
        .catch(() => undefined);
      await prisma.studentGuardian
        .deleteMany({ where: { studentId: convertedStudentId } })
        .catch(() => undefined);
      for (const sg of guardians) {
        await prisma.refreshToken
          .deleteMany({ where: { guardianId: sg.guardianId } })
          .catch(() => undefined);
        await prisma.guardian
          .delete({ where: { id: sg.guardianId } })
          .catch(() => undefined);
      }
      await prisma.enrollment
        .deleteMany({ where: { studentId: convertedStudentId } })
        .catch(() => undefined);
      await prisma.student
        .delete({ where: { id: convertedStudentId } })
        .catch(() => undefined);
    }
    if (applicantId) {
      await prisma.admissionFeeTransaction
        .deleteMany({ where: { applicantId } })
        .catch(() => undefined);
      await prisma.applicant
        .delete({ where: { id: applicantId } })
        .catch(() => undefined);
    }
    // Brief drain — the convert endpoint fires welcome notifications as
    // fire-and-forget; without this, those async calls run after app.close()
    // disconnects Prisma, producing a "require after env torn down" error in
    // Jest even though all tests pass. This is the same teardown artifact
    // documented elsewhere in this suite (BullMQ connections etc.).
    await new Promise((resolve) => setTimeout(resolve, 500));
    await app.close();
  }, 30_000);

  describe('POST /admissions/apply — public, unauthenticated', () => {
    it('creates an applicant in SUBMITTED status with no auth token', async () => {
      const res = await request(app.getHttpServer())
        .post('/admissions/apply')
        .send({
          firstName: 'TestApplicant',
          lastName: `AdmE2E${RUN_ID}`,
          dateOfBirth: '2011-09-01',
          gender: 'MALE',
          intendedClassLevel: 'JSS1',
          guardianFirstName: 'TestGuardian',
          guardianLastName: `AdmG${RUN_ID}`,
          guardianEmail: `admguardian.${RUN_ID}@example.com`,
          guardianPhone: '+2348099990001',
        })
        .expect(201);

      const applicant = res.body as ApplicantResponse;
      expect(applicant.id).toBeDefined();
      expect(applicant.status).toBe('SUBMITTED');
      expect(applicant.applicationFeePaid).toBe(false);
      applicantId = applicant.id;
    });

    it('validates required fields and returns 400 on missing data', async () => {
      await request(app.getHttpServer())
        .post('/admissions/apply')
        .send({ firstName: 'NoEmail' })
        .expect(400);
    });
  });

  describe('GET /admissions — list + detail', () => {
    it('Admin can list applicants', async () => {
      const res = await request(app.getHttpServer())
        .get('/admissions')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const list = res.body as ApplicantResponse[];
      expect(Array.isArray(list)).toBe(true);
      expect(list.some((a) => a.id === applicantId)).toBe(true);
    });

    it('VP can list applicants', async () => {
      await request(app.getHttpServer())
        .get('/admissions')
        .set('Authorization', `Bearer ${vpToken}`)
        .expect(200);
    });

    it('Teacher (non-Admin/VP) gets 403', async () => {
      await request(app.getHttpServer())
        .get('/admissions')
        .set('Authorization', `Bearer ${teacherToken}`)
        .expect(403);
    });

    it('Admin can fetch the applicant detail with fee transactions', async () => {
      const res = await request(app.getHttpServer())
        .get(`/admissions/${applicantId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const detail = res.body as ApplicantResponse & {
        feeTransactions: unknown[];
      };
      expect(detail.id).toBe(applicantId);
      expect(Array.isArray(detail.feeTransactions)).toBe(true);
    });
  });

  describe('PATCH /admissions/:id/review', () => {
    it('Admin can move applicant to UNDER_REVIEW', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/admissions/${applicantId}/review`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ decision: 'UNDER_REVIEW' })
        .expect(200);
      expect((res.body as ApplicantResponse).status).toBe('UNDER_REVIEW');
    });

    it('REJECTED requires reviewerNotes', async () => {
      await request(app.getHttpServer())
        .patch(`/admissions/${applicantId}/review`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ decision: 'REJECTED' })
        .expect(400);
    });

    it('Admin can APPROVE the applicant (triggers offer letter job)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/admissions/${applicantId}/review`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ decision: 'APPROVED' })
        .expect(200);
      expect((res.body as ApplicantResponse).status).toBe('APPROVED');
    });

    it('Cannot review an already-APPROVED applicant', async () => {
      await request(app.getHttpServer())
        .patch(`/admissions/${applicantId}/review`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ decision: 'UNDER_REVIEW' })
        .expect(400);
    });
  });

  describe('POST /admissions/:id/application-fee/checkout', () => {
    it('creates a Paystack checkout for the application fee', async () => {
      const res = await request(app.getHttpServer())
        .post(`/admissions/${applicantId}/application-fee/checkout`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201);
      const body = res.body as { authorizationUrl: string; reference: string };
      expect(body.authorizationUrl).toBeDefined();
      expect(body.reference).toMatch(/^ADMIT-/);
    });

    it('webhook: marks applicationFeePaid on a correctly-signed ADMIT- success event', async () => {
      // Get the reference we just created
      const applicant = await prisma.applicant.findUniqueOrThrow({
        where: { id: applicantId },
        include: {
          feeTransactions: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
      });
      const ref = applicant.feeTransactions[0].reference;

      const payload = {
        event: 'charge.success',
        data: { reference: ref, amount: 500000, status: 'success' },
      };
      const { rawBody, signature } = signPaystackPayload(
        payload,
        paystackSecretKey,
      );

      await request(app.getHttpServer())
        .post('/webhooks/paystack')
        .set('Content-Type', 'application/json')
        .set('x-paystack-signature', signature)
        .send(rawBody.toString('utf8'))
        .expect(200);

      const updated = await prisma.applicant.findUniqueOrThrow({
        where: { id: applicantId },
      });
      expect(updated.applicationFeePaid).toBe(true);
    });

    it('is idempotent — re-processing the same reference does not double-credit', async () => {
      const applicant = await prisma.applicant.findUniqueOrThrow({
        where: { id: applicantId },
        include: {
          feeTransactions: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
      });
      const ref = applicant.feeTransactions[0].reference;
      const payload = {
        event: 'charge.success',
        data: { reference: ref, amount: 500000, status: 'success' },
      };
      const { rawBody, signature } = signPaystackPayload(
        payload,
        paystackSecretKey,
      );

      // Second call — must also return 200 (idempotent)
      await request(app.getHttpServer())
        .post('/webhooks/paystack')
        .set('Content-Type', 'application/json')
        .set('x-paystack-signature', signature)
        .send(rawBody.toString('utf8'))
        .expect(200);

      // Fee still paid, transaction still SUCCESS (not double-marked)
      const txCount = await prisma.admissionFeeTransaction.count({
        where: { applicantId, status: 'SUCCESS' },
      });
      expect(txCount).toBe(1);
    });
  });

  describe('POST /admissions/:id/convert — the core "done when" check', () => {
    it('converts an APPROVED applicant into a real enrolled Student with a working guardian login', async () => {
      const res = await request(app.getHttpServer())
        .post(`/admissions/${applicantId}/convert`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ classId, armId })
        .expect(201);

      const body = res.body as { studentId: string; temporaryPassword: string };
      expect(body.studentId).toBeDefined();
      expect(body.temporaryPassword).toBeDefined();
      convertedStudentId = body.studentId;

      // Verify the student exists with an active enrollment
      const student = await prisma.student.findUniqueOrThrow({
        where: { id: convertedStudentId },
        include: {
          enrollments: true,
          guardians: { include: { guardian: true } },
        },
      });
      expect(student.firstName).toBe('TestApplicant');
      expect(student.enrollments).toHaveLength(1);
      expect(student.enrollments[0].status).toBe('ACTIVE');
      expect(student.enrollments[0].classId).toBe(classId);
      expect(student.guardians).toHaveLength(1);

      // Verify applicant is now CONVERTED
      const applicant = await prisma.applicant.findUniqueOrThrow({
        where: { id: applicantId },
      });
      expect(applicant.status).toBe('CONVERTED');
      expect(applicant.convertedStudentId).toBe(convertedStudentId);

      // Verify the guardian can log in with the temporary password
      const guardianEmail = student.guardians[0].guardian.email;
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: guardianEmail, password: body.temporaryPassword });
      expect(loginRes.status).toBe(201);
      expect(
        (loginRes.body as { user: { userType: string } }).user.userType,
      ).toBe('GUARDIAN');
    });

    it('rejects converting the same applicant twice (already CONVERTED)', async () => {
      await request(app.getHttpServer())
        .post(`/admissions/${applicantId}/convert`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ classId, armId })
        .expect(409);
    });

    it('only ADMIN can convert — VP gets 403', async () => {
      // Use a fresh applicant for this test since the original is already CONVERTED
      const applyRes = await request(app.getHttpServer())
        .post('/admissions/apply')
        .send({
          firstName: 'VPTest',
          lastName: `${RUN_ID}`,
          dateOfBirth: '2012-01-01',
          gender: 'FEMALE',
          intendedClassLevel: 'JSS1',
          guardianFirstName: 'VPGuardian',
          guardianLastName: `${RUN_ID}`,
          guardianEmail: `vptest.${RUN_ID}@example.com`,
          guardianPhone: '+2348099990002',
        })
        .expect(201);
      const vpApplicantId = (applyRes.body as IdResponse).id;
      await request(app.getHttpServer())
        .patch(`/admissions/${vpApplicantId}/review`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ decision: 'APPROVED' });

      await request(app.getHttpServer())
        .post(`/admissions/${vpApplicantId}/convert`)
        .set('Authorization', `Bearer ${vpToken}`)
        .send({ classId, armId })
        .expect(403);

      // Clean up this secondary applicant
      await prisma.applicant
        .delete({ where: { id: vpApplicantId } })
        .catch(() => undefined);
    });
  });
});
