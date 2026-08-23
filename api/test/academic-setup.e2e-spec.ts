import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';

const PASSWORD = 'Password123!';
const ADMIN_EMAIL = 'admin@demoschool.ng';
const TEACHER_EMAIL = 'tunde.bakare@demoschool.ng';

interface IdResponse {
  id: string;
}

interface TermResponse {
  id: string;
  name: string;
  isCurrent: boolean;
}

interface SessionResponse {
  id: string;
  terms: TermResponse[];
}

interface ArmResponse {
  id: string;
  classId: string;
}

interface TeacherAssignmentResponse {
  id: string;
  staffId: string;
  classSubjectId: string;
  termId: string;
}

interface CaWeightingEntry {
  name: string;
  weight: number;
}

// Suffix every record this suite creates so repeated runs against the real
// dev database (no test-DB reset between runs) never collide with leftovers
// from a previous run.
const RUN_ID = Date.now().toString(36);

describe('Academic setup (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let adminToken: string;
  let teacherToken: string;
  let teacherStaffId: string;
  let createdSessionId: string | undefined;
  let createdClassId: string | undefined;
  let createdSubjectId: string | undefined;
  let createdArmId: string | undefined;
  let createdMappingId: string | undefined;
  let createdAssignmentId: string | undefined;
  let previouslyCurrentTermId: string | undefined;
  let previousGradingScale: unknown;
  let previousCaWeighting: unknown;

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

    adminToken = await loginAndGetToken(app, ADMIN_EMAIL);
    teacherToken = await loginAndGetToken(app, TEACHER_EMAIL);

    const me = await request(app.getHttpServer())
      .get('/staff/me')
      .set('Authorization', `Bearer ${teacherToken}`);
    teacherStaffId = (me.body as IdResponse).id;

    // This suite's own test below changes which Term is globally current —
    // remember whatever was current beforehand so afterAll can restore it,
    // rather than leaving the whole dev DB with no current term at all
    // once this suite's own session/term gets cleaned up.
    previouslyCurrentTermId = (
      await prisma.term.findFirst({ where: { isCurrent: true } })
    )?.id;

    // This suite's own "PATCH /school/grading-scale" tests below overwrite
    // the single shared School row's gradingScale/caWeighting with a
    // simplified test scale — remember the real values so afterAll can put
    // them back, the same way previouslyCurrentTermId does for isCurrent.
    const school = await prisma.school.findFirst();
    previousGradingScale = school?.gradingScale;
    previousCaWeighting = school?.caWeighting;
  });

  afterAll(async () => {
    // Deletion order matters: schema.prisma deliberately makes
    // TeacherAssignment -> ClassSubject/Term and ClassSubject/Arm -> Class
    // Restrict (not Cascade), so the academic setup services can block
    // deletion while real data is still linked (see their
    // translatePrismaError messages) instead of silently cascading it
    // away. That means this cleanup must delete children before parents.
    if (createdAssignmentId) {
      await prisma.teacherAssignment
        .delete({ where: { id: createdAssignmentId } })
        .catch(() => undefined);
    }
    if (createdMappingId) {
      await prisma.classSubject
        .delete({ where: { id: createdMappingId } })
        .catch(() => undefined);
    }
    if (createdArmId) {
      await prisma.arm
        .delete({ where: { id: createdArmId } })
        .catch(() => undefined);
    }
    if (createdSessionId) {
      await prisma.academicSession
        .delete({ where: { id: createdSessionId } })
        .catch(() => undefined);
    }
    if (createdClassId) {
      await prisma.class
        .delete({ where: { id: createdClassId } })
        .catch(() => undefined);
    }
    if (createdSubjectId) {
      await prisma.subject
        .delete({ where: { id: createdSubjectId } })
        .catch(() => undefined);
    }
    // Restore whichever term was current before this suite ran — the
    // session deletion above just cascaded away the term this suite itself
    // marked current, leaving the dev DB with no current term at all
    // otherwise.
    if (previouslyCurrentTermId) {
      await prisma.term
        .update({
          where: { id: previouslyCurrentTermId },
          data: { isCurrent: true },
        })
        .catch(() => undefined);
    }
    // Restore the real gradingScale/caWeighting this suite overwrote above.
    if (
      previousGradingScale !== undefined ||
      previousCaWeighting !== undefined
    ) {
      const school = await prisma.school.findFirst();
      if (school) {
        await prisma.school
          .update({
            where: { id: school.id },
            data: {
              gradingScale: previousGradingScale as never,
              caWeighting: previousCaWeighting as never,
            },
          })
          .catch(() => undefined);
      }
    }
    await app.close();
  });

  async function loginAndGetToken(
    appRef: INestApplication<App>,
    email: string,
  ): Promise<string> {
    const res = await request(appRef.getHttpServer())
      .post('/auth/login')
      .send({ email, password: PASSWORD });
    return (res.body as { accessToken: string }).accessToken;
  }

  function asAdmin() {
    return { Authorization: `Bearer ${adminToken}` };
  }

  describe('GET /school', () => {
    it('is readable by any authenticated role (not just admin)', async () => {
      await request(app.getHttpServer())
        .get('/school')
        .set('Authorization', `Bearer ${teacherToken}`)
        .expect(200);
    });

    it('rejects an unauthenticated request', async () => {
      await request(app.getHttpServer()).get('/school').expect(401);
    });
  });

  describe('PATCH /school/grading-scale', () => {
    const validGradingScale = [
      { min: 75, max: 100, grade: 'A1', remark: 'Excellent' },
      { min: 0, max: 74, grade: 'F9', remark: 'Fail' },
    ];

    it('rejects weights that do not sum to 100', async () => {
      await request(app.getHttpServer())
        .patch('/school/grading-scale')
        .set(asAdmin())
        .send({
          gradingScale: validGradingScale,
          caWeighting: [
            { name: 'CA1', weight: 10 },
            { name: 'Exam', weight: 50 },
          ],
        })
        .expect(400);
    });

    it('rejects a non-admin caller', async () => {
      await request(app.getHttpServer())
        .patch('/school/grading-scale')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          gradingScale: validGradingScale,
          caWeighting: [{ name: 'Exam', weight: 100 }],
        })
        .expect(403);
    });

    it('accepts weights that sum to 100 and persists them', async () => {
      const caWeighting: CaWeightingEntry[] = [
        { name: 'CA1', weight: 10 },
        { name: 'CA2', weight: 10 },
        { name: 'CA3', weight: 10 },
        { name: 'Exam', weight: 70 },
      ];

      await request(app.getHttpServer())
        .patch('/school/grading-scale')
        .set(asAdmin())
        .send({ gradingScale: validGradingScale, caWeighting })
        .expect(200);

      const school = await request(app.getHttpServer())
        .get('/school')
        .set(asAdmin());
      expect(
        (school.body as { caWeighting: CaWeightingEntry[] }).caWeighting,
      ).toEqual(caWeighting);
    });
  });

  describe('POST /school/logo', () => {
    it('uploads to real object storage and the file is fetchable back', async () => {
      const pngBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
        'base64',
      );

      const res = await request(app.getHttpServer())
        .post('/school/logo')
        .set(asAdmin())
        .attach('file', pngBuffer, 'logo.png')
        .expect(201);

      const logoUrl = (res.body as { logoUrl: string }).logoUrl;
      expect(logoUrl).toMatch(
        /^http:\/\/localhost:9000\/sms-uploads\/school-logos\//,
      );

      // Prove it's really stored, not just a constructed string.
      const fetched = await fetch(logoUrl);
      expect(fetched.status).toBe(200);
    });

    it('rejects a non-image file', async () => {
      await request(app.getHttpServer())
        .post('/school/logo')
        .set(asAdmin())
        .attach('file', Buffer.from('not an image'), 'notes.txt')
        .expect(400);
    });
  });

  it('runs the full Stage 2 setup sequence purely through API calls', async () => {
    const server = app.getHttpServer();

    // 1. Create a new academic session with 3 terms.
    const sessionRes = await request(server)
      .post('/academic-sessions')
      .set(asAdmin())
      .send({
        name: `${RUN_ID}-2099/2100`,
        terms: [
          { name: 'First', startDate: '2099-09-15', endDate: '2099-12-12' },
          { name: 'Second', startDate: '2100-01-12', endDate: '2100-04-03' },
          { name: 'Third', startDate: '2100-04-20', endDate: '2100-07-24' },
        ],
      })
      .expect(201);
    const session = sessionRes.body as SessionResponse;
    createdSessionId = session.id;
    expect(session.terms).toHaveLength(3);
    const thirdTerm = session.terms.find((t) => t.name === 'Third')!;

    // 2. Mark one term current — and confirm the others are unset.
    await request(server)
      .post(`/terms/${thirdTerm.id}/set-current`)
      .set(asAdmin())
      .expect(201);
    const refetched = await request(server)
      .get(`/academic-sessions/${session.id}`)
      .set(asAdmin());
    const refetchedTerms = (refetched.body as SessionResponse).terms;
    expect(refetchedTerms.filter((t) => t.isCurrent)).toHaveLength(1);
    expect(refetchedTerms.find((t) => t.id === thirdTerm.id)?.isCurrent).toBe(
      true,
    );

    // 3. Add a class + arm.
    const classRes = await request(server)
      .post('/classes')
      .set(asAdmin())
      .send({ name: `JSS1-E2E-${RUN_ID}`, level: 99 })
      .expect(201);
    const klass = classRes.body as IdResponse;
    createdClassId = klass.id;
    const armRes = await request(server)
      .post(`/classes/${klass.id}/arms`)
      .set(asAdmin())
      .send({ name: 'Test Arm' })
      .expect(201);
    const arm = armRes.body as ArmResponse;
    createdArmId = arm.id;
    expect(arm.classId).toBe(klass.id);

    // 4. Add a subject and map it to the class.
    const subjectRes = await request(server)
      .post('/subjects')
      .set(asAdmin())
      .send({ name: `E2E Test Subject ${RUN_ID}`, code: `E2E-${RUN_ID}` })
      .expect(201);
    const subject = subjectRes.body as IdResponse;
    createdSubjectId = subject.id;
    const mappingRes = await request(server)
      .post(`/subjects/${subject.id}/classes`)
      .set(asAdmin())
      .send({ classId: klass.id })
      .expect(201);
    const mapping = mappingRes.body as IdResponse;
    createdMappingId = mapping.id;

    // Mapping the same subject to the same class twice must be rejected.
    await request(server)
      .post(`/subjects/${subject.id}/classes`)
      .set(asAdmin())
      .send({ classId: klass.id })
      .expect(409);

    // 5. Assign the seeded teacher to teach this class+subject for the current term.
    const assignmentRes = await request(server)
      .post(`/staff/${teacherStaffId}/teaching-assignments`)
      .set(asAdmin())
      .send({ classSubjectId: mapping.id, termId: thirdTerm.id })
      .expect(201);
    const assignment = assignmentRes.body as TeacherAssignmentResponse;
    createdAssignmentId = assignment.id;
    expect(assignment.staffId).toBe(teacherStaffId);
    expect(assignment.classSubjectId).toBe(mapping.id);
    expect(assignment.termId).toBe(thirdTerm.id);

    // Confirm it shows up when listing this teacher's assignments.
    const listRes = await request(server)
      .get(`/staff/${teacherStaffId}/teaching-assignments`)
      .set(asAdmin())
      .expect(200);
    const assignments = listRes.body as TeacherAssignmentResponse[];
    expect(assignments.some((a) => a.id === assignment.id)).toBe(true);

    // The teacher can fetch their OWN assignments (needed by the frontend's
    // attendance-marking context picker) but not another staff member's.
    const selfRes = await request(server)
      .get(`/staff/${teacherStaffId}/teaching-assignments`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .expect(200);
    expect(
      (selfRes.body as TeacherAssignmentResponse[]).some(
        (a) => a.id === assignment.id,
      ),
    ).toBe(true);

    const otherStaff = await prisma.staff.findFirstOrThrow({
      where: { id: { not: teacherStaffId } },
    });
    await request(server)
      .get(`/staff/${otherStaff.id}/teaching-assignments`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .expect(403);

    // A non-admin can't perform any of the writes above.
    await request(server)
      .post('/classes')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ name: 'Should Not Be Created', level: 1 })
      .expect(403);
  });

  describe('staff safety guards', () => {
    it('blocks an admin from deactivating their own account', async () => {
      const me = await request(app.getHttpServer())
        .get('/staff/me')
        .set(asAdmin());
      const adminId = (me.body as IdResponse).id;

      await request(app.getHttpServer())
        .patch(`/staff/${adminId}`)
        .set(asAdmin())
        .send({ isActive: false })
        .expect(400);
    });

    it('blocks removing the last Administrator role', async () => {
      const me = await request(app.getHttpServer())
        .get('/staff/me')
        .set(asAdmin());
      const admin = me.body as {
        id: string;
        roles: { id: string; role: string }[];
      };
      const adminRole = admin.roles.find((r) => r.role === 'ADMIN')!;

      await request(app.getHttpServer())
        .delete(`/staff/${admin.id}/roles/${adminRole.id}`)
        .set(asAdmin())
        .expect(400);
    });

    it('rejects creating a staff member whose email already belongs to a guardian', async () => {
      await request(app.getHttpServer())
        .post('/staff')
        .set(asAdmin())
        .send({
          firstName: 'Duplicate',
          lastName: 'Email',
          // Seeded by prisma/seed.ts for the first student (STU2025001).
          email: 'guardian.stu2025001@example.com',
        })
        .expect(409);
    });

    it('rejects a blank first/last name', async () => {
      await request(app.getHttpServer())
        .post('/staff')
        .set(asAdmin())
        .send({
          firstName: '',
          lastName: 'Person',
          email: `blank-${RUN_ID}@demoschool.ng`,
        })
        .expect(400);
    });

    it('blocks unmapping a subject from a class while a teacher is still assigned to it', async () => {
      const server = app.getHttpServer();

      const classRes = await request(server)
        .post('/classes')
        .set(asAdmin())
        .send({ name: `FK-GUARD-${RUN_ID}`, level: 98 })
        .expect(201);
      const klass = classRes.body as IdResponse;

      const subjectRes = await request(server)
        .post('/subjects')
        .set(asAdmin())
        .send({ name: `FK Guard Subject ${RUN_ID}`, code: `FKG-${RUN_ID}` })
        .expect(201);
      const subject = subjectRes.body as IdResponse;

      const mappingRes = await request(server)
        .post(`/subjects/${subject.id}/classes`)
        .set(asAdmin())
        .send({ classId: klass.id })
        .expect(201);
      const mapping = mappingRes.body as IdResponse;

      const currentTerm = await request(server)
        .get('/terms/current')
        .set(asAdmin());
      const termId = (currentTerm.body as { id: string }).id;

      const assignmentRes = await request(server)
        .post(`/staff/${teacherStaffId}/teaching-assignments`)
        .set(asAdmin())
        .send({ classSubjectId: mapping.id, termId })
        .expect(201);
      const assignment = assignmentRes.body as TeacherAssignmentResponse;

      // The actual guard under test: removing the mapping must be blocked
      // (409), not silently cascade away the teaching assignment — see
      // schema.prisma's comment on TeacherAssignment's Restrict FKs.
      await request(server)
        .delete(`/class-subjects/${mapping.id}`)
        .set(asAdmin())
        .expect(409);

      // Clean up in the order the Restrict FKs require: assignment, then
      // the mapping it was blocking, then the now-empty class/subject.
      await request(server)
        .delete(`/staff/teaching-assignments/${assignment.id}`)
        .set(asAdmin())
        .expect(204);
      await request(server)
        .delete(`/class-subjects/${mapping.id}`)
        .set(asAdmin())
        .expect(204);
      await request(server)
        .delete(`/classes/${klass.id}`)
        .set(asAdmin())
        .expect(204);
      await request(server)
        .delete(`/subjects/${subject.id}`)
        .set(asAdmin())
        .expect(204);
    });
  });
});
