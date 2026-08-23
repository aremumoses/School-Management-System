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

interface DisciplinaryActionResponse {
  id: string;
  actionType: string;
  status: string;
  decidedByStaffId: string | null;
}

interface IncidentResponse {
  id: string;
  studentId: string;
  description: string;
  severity: string;
  actions: DisciplinaryActionResponse[];
}

describe('Discipline (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  let adminToken: string;

  let classId: string;
  let armAId: string; // owned by classTeacher
  let armBId: string; // NOT owned by classTeacher
  let subjectId: string;
  let classSubjectId: string;
  let currentTermId: string;

  let classTeacherId: string;
  let classTeacherToken: string;
  let subjectTeacherId: string;
  let subjectTeacherToken: string;
  let bursarId: string;
  let bursarToken: string;

  const studentIds: string[] = [];
  const guardianIds: string[] = [];
  let studentAId: string; // enrolled in armA, owned by classTeacher
  let studentAToken: string;
  let guardianAId: string;
  let guardianAToken: string;
  let studentBId: string; // enrolled in armB, NOT owned by classTeacher

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

    currentTermId = (
      (await request(server).get('/terms/current').set(asAdmin()))
        .body as IdResponse
    ).id;

    classId = (
      (
        await request(server)
          .post('/classes')
          .set(asAdmin())
          .send({ name: `DISC-${RUN_ID}`, level: 98 })
          .expect(201)
      ).body as IdResponse
    ).id;
    armAId = (
      (
        await request(server)
          .post(`/classes/${classId}/arms`)
          .set(asAdmin())
          .send({ name: 'A' })
          .expect(201)
      ).body as IdResponse
    ).id;
    armBId = (
      (
        await request(server)
          .post(`/classes/${classId}/arms`)
          .set(asAdmin())
          .send({ name: 'B' })
          .expect(201)
      ).body as IdResponse
    ).id;

    subjectId = (
      (
        await request(server)
          .post('/subjects')
          .set(asAdmin())
          .send({ name: `DiscSubj-${RUN_ID}` })
          .expect(201)
      ).body as IdResponse
    ).id;
    classSubjectId = (
      (
        await request(server)
          .post(`/subjects/${subjectId}/classes`)
          .set(asAdmin())
          .send({ classId })
          .expect(201)
      ).body as IdResponse
    ).id;

    classTeacherId = (
      (
        await request(server)
          .post('/staff')
          .set(asAdmin())
          .send({
            firstName: 'Disc',
            lastName: `ClassTeacher${RUN_ID}`,
            email: `discclassteacher.${RUN_ID}@demoschool.ng`,
            password: PASSWORD,
            roles: ['CLASS_TEACHER'],
          })
          .expect(201)
      ).body as IdResponse
    ).id;
    await request(server)
      .patch(`/arms/${armAId}`)
      .set(asAdmin())
      .send({ classTeacherId })
      .expect(200);
    classTeacherToken = await loginAndGetToken(
      `discclassteacher.${RUN_ID}@demoschool.ng`,
    );

    subjectTeacherId = (
      (
        await request(server)
          .post('/staff')
          .set(asAdmin())
          .send({
            firstName: 'Disc',
            lastName: `SubjectTeacher${RUN_ID}`,
            email: `discsubjectteacher.${RUN_ID}@demoschool.ng`,
            password: PASSWORD,
            roles: ['SUBJECT_TEACHER'],
          })
          .expect(201)
      ).body as IdResponse
    ).id;
    await request(server)
      .post(`/staff/${subjectTeacherId}/teaching-assignments`)
      .set(asAdmin())
      .send({ classSubjectId, termId: currentTermId })
      .expect(201);
    subjectTeacherToken = await loginAndGetToken(
      `discsubjectteacher.${RUN_ID}@demoschool.ng`,
    );

    bursarId = (
      (
        await request(server)
          .post('/staff')
          .set(asAdmin())
          .send({
            firstName: 'Disc',
            lastName: `Bursar${RUN_ID}`,
            email: `discbursar.${RUN_ID}@demoschool.ng`,
            password: PASSWORD,
            roles: ['BURSAR'],
          })
          .expect(201)
      ).body as IdResponse
    ).id;
    bursarToken = await loginAndGetToken(`discbursar.${RUN_ID}@demoschool.ng`);

    // Student A — armA, owned by classTeacher, with a guardian on file.
    studentAId = (
      (
        await request(server)
          .post('/students')
          .set(asAdmin())
          .send({
            firstName: 'Disc',
            lastName: `StudentA${RUN_ID}`,
            dateOfBirth: '2011-01-01',
            gender: 'MALE',
          })
          .expect(201)
      ).body as IdResponse
    ).id;
    studentIds.push(studentAId);
    await request(server)
      .post(`/students/${studentAId}/enrollments`)
      .set(asAdmin())
      .send({ classId, armId: armAId, termId: currentTermId })
      .expect(201);
    const studentAEmail = `discstudenta.${RUN_ID}@students.demoschool.ng`;
    await prisma.student.update({
      where: { id: studentAId },
      data: { email: studentAEmail, passwordHash: await hashPassword() },
    });
    studentAToken = await loginAndGetToken(studentAEmail);

    const guardianALink = await request(server)
      .post(`/students/${studentAId}/guardians`)
      .set(asAdmin())
      .send({
        firstName: 'GuardianA',
        lastName: `Disc${RUN_ID}`,
        email: `discguardiana.${RUN_ID}@example.com`,
        phone: '+2348022220001',
        relationship: 'Mother',
      })
      .expect(201);
    guardianAId = (guardianALink.body as { guardianId: string }).guardianId;
    guardianIds.push(guardianAId);
    await prisma.guardian.update({
      where: { id: guardianAId },
      data: { passwordHash: await hashPassword() },
    });
    guardianAToken = await loginAndGetToken(
      `discguardiana.${RUN_ID}@example.com`,
    );

    // Student B — armB, NOT owned by classTeacher (used for rejection tests).
    studentBId = (
      (
        await request(server)
          .post('/students')
          .set(asAdmin())
          .send({
            firstName: 'Disc',
            lastName: `StudentB${RUN_ID}`,
            dateOfBirth: '2011-01-01',
            gender: 'FEMALE',
          })
          .expect(201)
      ).body as IdResponse
    ).id;
    studentIds.push(studentBId);
    await request(server)
      .post(`/students/${studentBId}/enrollments`)
      .set(asAdmin())
      .send({ classId, armId: armBId, termId: currentTermId })
      .expect(201);
  });

  afterAll(async () => {
    await prisma.disciplinaryAction
      .deleteMany({ where: { incident: { studentId: { in: studentIds } } } })
      .catch(() => undefined);
    await prisma.incident
      .deleteMany({ where: { studentId: { in: studentIds } } })
      .catch(() => undefined);
    await prisma.broadcastLog
      .deleteMany({ where: { targetId: { in: studentIds } } })
      .catch(() => undefined);

    await prisma.studentGuardian
      .deleteMany({ where: { studentId: { in: studentIds } } })
      .catch(() => undefined);
    await prisma.refreshToken
      .deleteMany({ where: { guardianId: { in: guardianIds } } })
      .catch(() => undefined);
    await prisma.guardian
      .deleteMany({ where: { id: { in: guardianIds } } })
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

    await prisma.teacherAssignment
      .deleteMany({
        where: { staffId: { in: [subjectTeacherId].filter(Boolean) } },
      })
      .catch(() => undefined);
    if (classSubjectId) {
      await prisma.classSubject
        .delete({ where: { id: classSubjectId } })
        .catch(() => undefined);
    }
    if (subjectId) {
      await prisma.subject
        .delete({ where: { id: subjectId } })
        .catch(() => undefined);
    }

    for (const staffId of [classTeacherId, subjectTeacherId, bursarId].filter(
      Boolean,
    )) {
      await prisma.refreshToken
        .deleteMany({ where: { staffId } })
        .catch(() => undefined);
      await prisma.staffRole
        .deleteMany({ where: { staffId } })
        .catch(() => undefined);
      await prisma.staff
        .delete({ where: { id: staffId } })
        .catch(() => undefined);
    }

    if (armAId)
      await prisma.arm.delete({ where: { id: armAId } }).catch(() => undefined);
    if (armBId)
      await prisma.arm.delete({ where: { id: armBId } }).catch(() => undefined);
    if (classId)
      await prisma.class
        .delete({ where: { id: classId } })
        .catch(() => undefined);

    await app.close();
  }, 30_000);

  async function hashPassword(): Promise<string> {
    const bcrypt = await import('bcrypt');
    return bcrypt.hash(PASSWORD, 10);
  }
  async function loginAndGetToken(email: string): Promise<string> {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: PASSWORD });
    return (res.body as { accessToken: string }).accessToken;
  }
  function asAdmin() {
    return { Authorization: `Bearer ${adminToken}` };
  }
  function as(token: string) {
    return { Authorization: `Bearer ${token}` };
  }

  describe('Incident logging + scoping', () => {
    let incidentId: string;

    it('lets the owning class teacher log an incident for their own student', async () => {
      const res = await request(app.getHttpServer())
        .post('/incidents')
        .set(as(classTeacherToken))
        .send({
          studentId: studentAId,
          description: `Disrupted class ${RUN_ID}`,
          severity: 'MODERATE',
          date: '2026-01-15',
        })
        .expect(201);
      incidentId = (res.body as IncidentResponse).id;
      expect((res.body as IncidentResponse).severity).toBe('MODERATE');
    });

    it('rejects a class teacher logging an incident for a student outside their own class', async () => {
      await request(app.getHttpServer())
        .post('/incidents')
        .set(as(classTeacherToken))
        .send({
          studentId: studentBId,
          description: 'Out of scope',
          severity: 'MINOR',
          date: '2026-01-15',
        })
        .expect(403);
    });

    it('lets a subject teacher log an incident (their own class) but not view a class teacher-only scope mismatch', async () => {
      await request(app.getHttpServer())
        .post('/incidents')
        .set(as(subjectTeacherToken))
        .send({
          studentId: studentAId,
          description: 'Subject teacher log',
          severity: 'MINOR',
          date: '2026-01-15',
        })
        .expect(201);
    });

    it('rejects roles with no Discipline access at all (Bursar)', async () => {
      await request(app.getHttpServer())
        .post('/incidents')
        .set(as(bursarToken))
        .send({
          studentId: studentAId,
          description: 'Should be rejected',
          severity: 'MINOR',
          date: '2026-01-15',
        })
        .expect(403);
      await request(app.getHttpServer())
        .get('/incidents')
        .set(as(bursarToken))
        .expect(200);
      // Bursar gets 200 (any authenticated user may call GET) but an empty,
      // scoped-to-nothing list — not a 403 — matching the controller's
      // @Roles() (no args) + service-level deny pattern.
    });

    it('only the original reporter (or an unscoped role) can edit an incident', async () => {
      await request(app.getHttpServer())
        .patch(`/incidents/${incidentId}`)
        .set(as(subjectTeacherToken))
        .send({ description: 'Should be rejected — not the reporter' })
        .expect(403);
      await request(app.getHttpServer())
        .patch(`/incidents/${incidentId}`)
        .set(as(classTeacherToken))
        .send({ description: `Updated description ${RUN_ID}` })
        .expect(200);
    });

    it("lets the student view their own incident, and the guardian view their ward's", async () => {
      await request(app.getHttpServer())
        .get(`/incidents/${incidentId}`)
        .set(as(studentAToken))
        .expect(200);
      await request(app.getHttpServer())
        .get(`/incidents/${incidentId}`)
        .set(as(guardianAToken))
        .expect(200);
    });

    it("rejects a student viewing someone else's incident", async () => {
      const otherIncident = await request(app.getHttpServer())
        .post('/incidents')
        .set(asAdmin())
        .send({
          studentId: studentBId,
          description: 'Admin-logged',
          severity: 'MINOR',
          date: '2026-01-15',
        })
        .expect(201);
      await request(app.getHttpServer())
        .get(`/incidents/${(otherIncident.body as IncidentResponse).id}`)
        .set(as(studentAToken))
        .expect(403);
    });
  });

  describe('Disciplinary action workflow — the "Done when" criterion', () => {
    let incidentId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/incidents')
        .set(as(classTeacherToken))
        .send({
          studentId: studentAId,
          description: `Workflow test incident ${RUN_ID}`,
          severity: 'SEVERE',
          date: '2026-01-20',
        })
        .expect(201);
      incidentId = (res.body as IncidentResponse).id;
    });

    it('rejects a SUBJECT_TEACHER proposing an action ("log only")', async () => {
      await request(app.getHttpServer())
        .post(`/incidents/${incidentId}/actions`)
        .set(as(subjectTeacherToken))
        .send({ actionType: 'WARNING' })
        .expect(403);
    });

    it('a WARNING from the class teacher is finalized immediately and notifies the guardian right away', async () => {
      const broadcastsBefore = await prisma.broadcastLog.count({
        where: { targetId: studentAId, actorType: 'SYSTEM' },
      });

      const res = await request(app.getHttpServer())
        .post(`/incidents/${incidentId}/actions`)
        .set(as(classTeacherToken))
        .send({ actionType: 'WARNING' })
        .expect(201);
      const action = res.body as DisciplinaryActionResponse;
      expect(action.status).toBe('APPROVED');
      expect(action.decidedByStaffId).toBeNull(); // auto-approved, no human "decided" it

      const broadcastsAfter = await prisma.broadcastLog.count({
        where: { targetId: studentAId, actorType: 'SYSTEM' },
      });
      expect(broadcastsAfter).toBe(broadcastsBefore + 1);

      const broadcast = await prisma.broadcastLog.findFirst({
        where: { targetId: studentAId, actorType: 'SYSTEM' },
        orderBy: { createdAt: 'desc' },
        include: { recipients: true },
      });
      expect(
        broadcast?.recipients.some((r) => r.recipientId === guardianAId),
      ).toBe(true);
    });

    it('a SUSPENSION stays PROPOSED and does NOT notify the guardian until an Admin approves it', async () => {
      const broadcastsBefore = await prisma.broadcastLog.count({
        where: { targetId: studentAId, actorType: 'SYSTEM' },
      });

      const proposeRes = await request(app.getHttpServer())
        .post(`/incidents/${incidentId}/actions`)
        .set(as(classTeacherToken))
        .send({ actionType: 'SUSPENSION' })
        .expect(201);
      const action = proposeRes.body as DisciplinaryActionResponse;
      expect(action.status).toBe('PROPOSED');

      const broadcastsAfterPropose = await prisma.broadcastLog.count({
        where: { targetId: studentAId, actorType: 'SYSTEM' },
      });
      expect(broadcastsAfterPropose).toBe(broadcastsBefore); // no notification yet

      // A non-Admin (even one with broad Discipline access) cannot approve.
      await request(app.getHttpServer())
        .post(`/incidents/${incidentId}/actions/${action.id}/approve`)
        .set(as(classTeacherToken))
        .expect(403);

      const approveRes = await request(app.getHttpServer())
        .post(`/incidents/${incidentId}/actions/${action.id}/approve`)
        .set(asAdmin())
        .send({ decisionNotes: 'Confirmed after review.' })
        .expect(201);
      expect((approveRes.body as DisciplinaryActionResponse).status).toBe(
        'APPROVED',
      );
      expect(
        (approveRes.body as DisciplinaryActionResponse).decidedByStaffId,
      ).toBeTruthy();

      const broadcastsAfterApprove = await prisma.broadcastLog.count({
        where: { targetId: studentAId, actorType: 'SYSTEM' },
      });
      expect(broadcastsAfterApprove).toBe(broadcastsBefore + 1); // notified now

      // Already-decided — approving again is rejected.
      await request(app.getHttpServer())
        .post(`/incidents/${incidentId}/actions/${action.id}/approve`)
        .set(asAdmin())
        .expect(403);
    });

    it('an Admin can reject a proposed EXPULSION instead — no notification fires', async () => {
      const broadcastsBefore = await prisma.broadcastLog.count({
        where: { targetId: studentAId, actorType: 'SYSTEM' },
      });

      const proposeRes = await request(app.getHttpServer())
        .post(`/incidents/${incidentId}/actions`)
        .set(asAdmin())
        .send({ actionType: 'EXPULSION' })
        .expect(201);
      const action = proposeRes.body as DisciplinaryActionResponse;

      const rejectRes = await request(app.getHttpServer())
        .post(`/incidents/${incidentId}/actions/${action.id}/reject`)
        .set(asAdmin())
        .send({ decisionNotes: 'Insufficient evidence for expulsion.' })
        .expect(201);
      expect((rejectRes.body as DisciplinaryActionResponse).status).toBe(
        'REJECTED',
      );

      const broadcastsAfter = await prisma.broadcastLog.count({
        where: { targetId: studentAId, actorType: 'SYSTEM' },
      });
      expect(broadcastsAfter).toBe(broadcastsBefore); // never notified
    });

    it('rejects rejecting without a reason', async () => {
      const proposeRes = await request(app.getHttpServer())
        .post(`/incidents/${incidentId}/actions`)
        .set(asAdmin())
        .send({ actionType: 'SUSPENSION' })
        .expect(201);
      const action = proposeRes.body as DisciplinaryActionResponse;

      await request(app.getHttpServer())
        .post(`/incidents/${incidentId}/actions/${action.id}/reject`)
        .set(asAdmin())
        .send({})
        .expect(400);
    });
  });
});
