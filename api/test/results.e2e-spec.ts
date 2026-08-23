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

interface SubjectResultRow {
  subjectName: string;
  total: number;
  grade: string;
  positionInSubject: number;
  classAverageForSubject: number;
}

interface BroadsheetRow {
  studentId: string;
  overallAverage: number;
  overallPosition: number;
  classSize: number;
  subjects: SubjectResultRow[];
}

interface BroadsheetResponse {
  status: { stage: string; allSubjectsLocked: boolean };
  rows: BroadsheetRow[];
}

interface StatusResponse {
  stage: string;
  allSubjectsLocked: boolean;
  outstandingSubjects: {
    classSubjectId: string;
    subjectName: string;
    locked: boolean;
  }[];
  returnReason: string | null;
}

describe('Results — Academics & Results Engine full term-end cycle (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let adminToken: string;
  let examOfficerToken: string;
  let bursarToken: string;

  let currentTermId: string;
  let classId: string;
  let badClassId: string;
  let armId: string;

  let teacherAId: string;
  let teacherAToken: string;
  let teacherBId: string;
  let teacherBToken: string;
  let classTeacherId: string;
  let classTeacherToken: string;

  let subject1Id: string;
  let subject2Id: string;
  let subject3Id: string;
  let badSubjectId: string;
  let classSubject1Id: string;
  let classSubject2Id: string;
  let classSubject3Id: string;
  let badClassSubjectId: string;

  const studentIds: string[] = [];
  let s1: string, s2: string, s3: string, s4: string, s5: string;

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
    examOfficerToken = await loginAndGetToken('examofficer@demoschool.ng');
    bursarToken = await loginAndGetToken('bursar@demoschool.ng');

    // Anchored to the seeded "Third" term of "2025/2026" by name, NOT via
    // GET /terms/current — academic-setup.e2e-spec.ts's own test
    // temporarily flips the global isCurrent flag to one of its own
    // fixture terms mid-run (restoring it in its own afterAll), which
    // races with any OTHER spec file calling /terms/current while the
    // full e2e suite runs in parallel. This test specifically needs the
    // seeded default AssessmentComponent rows (CA1/CA2/CA3/Exam), which
    // only exist on that one specific, stable term.
    const seededSession = await prisma.academicSession.findUniqueOrThrow({
      where: { name: '2025/2026' },
    });
    currentTermId = (
      await prisma.term.findUniqueOrThrow({
        where: {
          sessionId_name: { sessionId: seededSession.id, name: 'Third' },
        },
      })
    ).id;

    classId = (
      (
        await request(server)
          .post('/classes')
          .set(asAdmin())
          .send({ name: `RES-${RUN_ID}`, level: 97 })
          .expect(201)
      ).body as IdResponse
    ).id;
    armId = (
      (
        await request(server)
          .post(`/classes/${classId}/arms`)
          .set(asAdmin())
          .send({ name: 'Core' })
          .expect(201)
      ).body as IdResponse
    ).id;

    // Three real subjects (use the school-wide default CA1/CA2/CA3/Exam
    // structure already seeded for the current term) + one deliberately
    // misconfigured subject for the "weights don't sum to 100" rejection.
    for (const [varName, name] of [
      ['subject1Id', `E2E-Physics-${RUN_ID}`],
      ['subject2Id', `E2E-Chemistry-${RUN_ID}`],
      ['subject3Id', `E2E-Biology-${RUN_ID}`],
      ['badSubjectId', `E2E-Bad-${RUN_ID}`],
    ] as const) {
      const id = (
        (
          await request(server)
            .post('/subjects')
            .set(asAdmin())
            .send({ name })
            .expect(201)
        ).body as IdResponse
      ).id;
      if (varName === 'subject1Id') subject1Id = id;
      if (varName === 'subject2Id') subject2Id = id;
      if (varName === 'subject3Id') subject3Id = id;
      if (varName === 'badSubjectId') badSubjectId = id;
    }

    classSubject1Id = (
      (
        await request(server)
          .post(`/subjects/${subject1Id}/classes`)
          .set(asAdmin())
          .send({ classId })
          .expect(201)
      ).body as IdResponse
    ).id;
    classSubject2Id = (
      (
        await request(server)
          .post(`/subjects/${subject2Id}/classes`)
          .set(asAdmin())
          .send({ classId })
          .expect(201)
      ).body as IdResponse
    ).id;
    classSubject3Id = (
      (
        await request(server)
          .post(`/subjects/${subject3Id}/classes`)
          .set(asAdmin())
          .send({ classId })
          .expect(201)
      ).body as IdResponse
    ).id;
    // badSubjectId is mapped to a SEPARATE throwaway class, not `classId` —
    // ResultsService's "all subjects locked" check considers every
    // ClassSubject on `classId`, so an intentionally-unlockable subject
    // there would make the main collate test impossible to ever satisfy.
    badClassId = (
      (
        await request(server)
          .post('/classes')
          .set(asAdmin())
          .send({ name: `RES-BAD-${RUN_ID}`, level: 98 })
          .expect(201)
      ).body as IdResponse
    ).id;
    badClassSubjectId = (
      (
        await request(server)
          .post(`/subjects/${badSubjectId}/classes`)
          .set(asAdmin())
          .send({ classId: badClassId })
          .expect(201)
      ).body as IdResponse
    ).id;

    // Incomplete override for the bad subject — only 50 of 100 points
    // configured, so assertReadyForSubmission must reject any submit.
    await request(server)
      .post('/assessment-components')
      .set(asAdmin())
      .send({
        termId: currentTermId,
        subjectId: badSubjectId,
        name: 'OnlyHalf',
        maxScore: 50,
        weight: 50,
      })
      .expect(201);

    // Staff: two Subject Teachers (teacherA: subjects 1+2, teacherB: subject 3
    // — "multiple subjects/teachers") and one Class Teacher owning the arm.
    teacherAId = (
      (
        await request(server)
          .post('/staff')
          .set(asAdmin())
          .send({
            firstName: 'TeacherA',
            lastName: `Res${RUN_ID}`,
            email: `teachera.${RUN_ID}@demoschool.ng`,
            password: PASSWORD,
            roles: ['SUBJECT_TEACHER'],
          })
          .expect(201)
      ).body as IdResponse
    ).id;
    teacherAToken = await loginAndGetToken(`teachera.${RUN_ID}@demoschool.ng`);
    teacherBId = (
      (
        await request(server)
          .post('/staff')
          .set(asAdmin())
          .send({
            firstName: 'TeacherB',
            lastName: `Res${RUN_ID}`,
            email: `teacherb.${RUN_ID}@demoschool.ng`,
            password: PASSWORD,
            roles: ['SUBJECT_TEACHER'],
          })
          .expect(201)
      ).body as IdResponse
    ).id;
    teacherBToken = await loginAndGetToken(`teacherb.${RUN_ID}@demoschool.ng`);
    classTeacherId = (
      (
        await request(server)
          .post('/staff')
          .set(asAdmin())
          .send({
            firstName: 'ClassT',
            lastName: `Res${RUN_ID}`,
            email: `classt.${RUN_ID}@demoschool.ng`,
            password: PASSWORD,
            roles: ['CLASS_TEACHER'],
          })
          .expect(201)
      ).body as IdResponse
    ).id;
    classTeacherToken = await loginAndGetToken(
      `classt.${RUN_ID}@demoschool.ng`,
    );
    await request(server)
      .patch(`/arms/${armId}`)
      .set(asAdmin())
      .send({ classTeacherId })
      .expect(200);

    for (const classSubjectId of [classSubject1Id, classSubject2Id]) {
      await request(server)
        .post(`/staff/${teacherAId}/teaching-assignments`)
        .set(asAdmin())
        .send({ classSubjectId, termId: currentTermId })
        .expect(201);
    }
    for (const classSubjectId of [classSubject3Id, badClassSubjectId]) {
      await request(server)
        .post(`/staff/${teacherBId}/teaching-assignments`)
        .set(asAdmin())
        .send({ classSubjectId, termId: currentTermId })
        .expect(201);
    }

    // Five students, all actively enrolled in this arm/term.
    for (let i = 0; i < 5; i++) {
      const studentId = (
        (
          await request(server)
            .post('/students')
            .set(asAdmin())
            .send({
              firstName: `Res${i}`,
              lastName: `Student${RUN_ID}`,
              dateOfBirth: '2013-01-01',
              gender: i % 2 === 0 ? 'MALE' : 'FEMALE',
            })
            .expect(201)
        ).body as IdResponse
      ).id;
      await request(server)
        .post(`/students/${studentId}/enrollments`)
        .set(asAdmin())
        .send({ classId, armId, termId: currentTermId })
        .expect(201);
      studentIds.push(studentId);
    }
    [s1, s2, s3, s4, s5] = studentIds;
  }, 30000);

  afterAll(async () => {
    await prisma.studentTermResult
      .deleteMany({ where: { studentId: { in: studentIds } } })
      .catch(() => undefined);
    // Guarded — armId undefined (an earlier beforeAll step never reached
    // its assignment) would make this `where` collapse to `{}` and wipe
    // every class's result-workflow stage school-wide, not just this
    // fixture's. Same reasoning on every other guarded delete below.
    if (armId) {
      await prisma.classTermResultStatus
        .deleteMany({ where: { armId } })
        .catch(() => undefined);
    }
    await prisma.conductRating
      .deleteMany({ where: { studentId: { in: studentIds } } })
      .catch(() => undefined);
    await prisma.score
      .deleteMany({
        where: {
          classSubjectId: {
            in: [
              classSubject1Id,
              classSubject2Id,
              classSubject3Id,
              badClassSubjectId,
            ],
          },
        },
      })
      .catch(() => undefined);
    await prisma.scoreSubmission
      .deleteMany({
        where: {
          classSubjectId: {
            in: [
              classSubject1Id,
              classSubject2Id,
              classSubject3Id,
              badClassSubjectId,
            ],
          },
        },
      })
      .catch(() => undefined);
    // badSubjectId undefined would drop that key and wipe every
    // AssessmentComponent for currentTermId — including the real seeded
    // school-wide default CA1/CA2/CA3/Exam structure every other test
    // (and the live dev environment) depends on.
    if (badSubjectId) {
      await prisma.assessmentComponent
        .deleteMany({
          where: { termId: currentTermId, subjectId: badSubjectId },
        })
        .catch(() => undefined);
    }
    await prisma.enrollment
      .deleteMany({ where: { studentId: { in: studentIds } } })
      .catch(() => undefined);
    await prisma.student
      .deleteMany({ where: { id: { in: studentIds } } })
      .catch(() => undefined);

    await prisma.teacherAssignment
      .deleteMany({ where: { staffId: { in: [teacherAId, teacherBId] } } })
      .catch(() => undefined);
    // .filter(Boolean) — an undefined entry here (an earlier beforeAll
    // step that never reached its assignment) would make deleteMany's
    // `where: { staffId }` collapse to `{}` and wipe that table for
    // EVERY staff member in the database, not just this fixture's.
    for (const staffId of [teacherAId, teacherBId, classTeacherId].filter(
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

    for (const id of [
      classSubject1Id,
      classSubject2Id,
      classSubject3Id,
      badClassSubjectId,
    ]) {
      await prisma.classSubject
        .delete({ where: { id } })
        .catch(() => undefined);
    }
    for (const id of [subject1Id, subject2Id, subject3Id, badSubjectId]) {
      await prisma.subject.delete({ where: { id } }).catch(() => undefined);
    }
    await prisma.arm.delete({ where: { id: armId } }).catch(() => undefined);
    await prisma.class
      .delete({ where: { id: classId } })
      .catch(() => undefined);
    await prisma.class
      .delete({ where: { id: badClassId } })
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
  function as(token: string) {
    return { Authorization: `Bearer ${token}` };
  }

  async function componentIds(): Promise<Record<string, string>> {
    const list = (
      await request(app.getHttpServer())
        .get('/assessment-components')
        .query({ termId: currentTermId, subjectId: subject1Id })
        .set(asAdmin())
        .expect(200)
    ).body as { id: string; name: string }[];
    return Object.fromEntries(list.map((c) => [c.name, c.id]));
  }

  it('rejects submission for a subject whose components do not sum to 100', async () => {
    const components = (
      await request(app.getHttpServer())
        .get('/assessment-components')
        .query({ termId: currentTermId, subjectId: badSubjectId })
        .set(asAdmin())
        .expect(200)
    ).body as { id: string; name: string }[];
    const onlyHalf = components.find((c) => c.name === 'OnlyHalf')!;

    await request(app.getHttpServer())
      .post('/scores/submit')
      .set(as(teacherBToken))
      .send({
        classSubjectId: badClassSubjectId,
        termId: currentTermId,
        entries: [
          { studentId: s1, assessmentComponentId: onlyHalf.id, score: 50 },
        ],
      })
      .expect(400);
  });

  it('rejects submission from a teacher not assigned to that class/subject', async () => {
    const ids = await componentIds();
    await request(app.getHttpServer())
      .post('/scores/submit')
      .set(as(teacherBToken)) // not assigned to subject1
      .send({
        classSubjectId: classSubject1Id,
        termId: currentTermId,
        entries: [{ studentId: s1, assessmentComponentId: ids.CA1, score: 5 }],
      })
      .expect(403);
  });

  it('rejects a score exceeding the component max', async () => {
    const ids = await componentIds();
    await request(app.getHttpServer())
      .post('/scores/submit')
      .set(as(teacherAToken))
      .send({
        classSubjectId: classSubject1Id,
        termId: currentTermId,
        entries: [
          { studentId: s1, assessmentComponentId: ids.CA1, score: 999 },
        ],
      })
      .expect(400);
  });

  it('enforces a past score-entry deadline, then allows submission again once cleared', async () => {
    const assignment = await prisma.teacherAssignment.findFirstOrThrow({
      where: {
        staffId: teacherAId,
        classSubjectId: classSubject1Id,
        termId: currentTermId,
      },
    });
    await request(app.getHttpServer())
      .patch(`/staff/teaching-assignments/${assignment.id}/deadline`)
      .set(asAdmin())
      .send({ scoreEntryDeadline: '2000-01-01T00:00:00.000Z' })
      .expect(200);

    const ids = await componentIds();
    await request(app.getHttpServer())
      .post('/scores/submit')
      .set(as(teacherAToken))
      .send({
        classSubjectId: classSubject1Id,
        termId: currentTermId,
        entries: [{ studentId: s1, assessmentComponentId: ids.CA1, score: 5 }],
      })
      .expect(403);

    await request(app.getHttpServer())
      .patch(`/staff/teaching-assignments/${assignment.id}/deadline`)
      .set(asAdmin())
      .send({ scoreEntryDeadline: null })
      .expect(200);

    await request(app.getHttpServer())
      .post('/scores/submit')
      .set(as(teacherAToken))
      .send({
        classSubjectId: classSubject1Id,
        termId: currentTermId,
        entries: [{ studentId: s1, assessmentComponentId: ids.CA1, score: 5 }],
      })
      .expect(201);

    // That submit just locked classSubject1 — unlock it again so the next
    // test (which exercises the "first submit succeeds" path itself)
    // starts from a clean, unlocked state.
    await request(app.getHttpServer())
      .post('/scores/unlock')
      .set(as(examOfficerToken))
      .send({
        classSubjectId: classSubject1Id,
        termId: currentTermId,
        reason: 'Resetting for the next test',
      })
      .expect(201);
  });

  it('locks on submit, rejects a second submit, then accepts again after an audited unlock', async () => {
    const ids = await componentIds();
    await request(app.getHttpServer())
      .post('/scores/submit')
      .set(as(teacherAToken))
      .send({
        classSubjectId: classSubject1Id,
        termId: currentTermId,
        entries: [{ studentId: s2, assessmentComponentId: ids.CA2, score: 7 }],
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/scores/submit')
      .set(as(teacherAToken))
      .send({
        classSubjectId: classSubject1Id,
        termId: currentTermId,
        entries: [{ studentId: s2, assessmentComponentId: ids.CA3, score: 7 }],
      })
      .expect(403);

    // Non-privileged role cannot unlock.
    await request(app.getHttpServer())
      .post('/scores/unlock')
      .set(as(teacherAToken))
      .send({
        classSubjectId: classSubject1Id,
        termId: currentTermId,
        reason: 'nope',
      })
      .expect(403);

    await request(app.getHttpServer())
      .post('/scores/unlock')
      .set(as(examOfficerToken))
      .send({
        classSubjectId: classSubject1Id,
        termId: currentTermId,
        reason: 'Correcting a transcription error',
      })
      .expect(201);

    const auditRow = await prisma.auditLog.findFirst({
      where: { action: 'SCORE_UNLOCK', entityType: 'ScoreSubmission' },
      orderBy: { createdAt: 'desc' },
    });
    expect(auditRow).toBeTruthy();
    expect((auditRow!.afterJson as { reason: string }).reason).toBe(
      'Correcting a transcription error',
    );

    await request(app.getHttpServer())
      .post('/scores/submit')
      .set(as(teacherAToken))
      .send({
        classSubjectId: classSubject1Id,
        termId: currentTermId,
        entries: [{ studentId: s2, assessmentComponentId: ids.CA3, score: 7 }],
      })
      .expect(201);
  });

  it('blocks changing/removing an assessment component once scores are locked against it', async () => {
    // classSubject1 is locked at this point (the previous test ends with a
    // successful submit). Use the default (subjectId: null) CA1 component,
    // which subject1 falls back to since it has no override of its own.
    const components = await componentIds();

    await request(app.getHttpServer())
      .patch(`/assessment-components/${components.CA1}`)
      .set(asAdmin())
      .send({ weight: 15 })
      .expect(400);
    await request(app.getHttpServer())
      .delete(`/assessment-components/${components.CA1}`)
      .set(asAdmin())
      .expect(400);
    await request(app.getHttpServer())
      .post('/assessment-components')
      .set(asAdmin())
      .send({
        termId: currentTermId,
        name: `Extra-${RUN_ID}`,
        maxScore: 5,
        weight: 5,
      })
      .expect(400);

    // A cosmetic rename (no weight/maxScore change) is still fine — it
    // doesn't affect any already-computed percentage.
    await request(app.getHttpServer())
      .patch(`/assessment-components/${components.CA1}`)
      .set(asAdmin())
      .send({ name: 'CA1' })
      .expect(200);

    // The maxScore-vs-recorded-score check is independent of the lock —
    // unlock first so this specifically exercises *that* check rather than
    // incidentally passing because of the lock-based one above.
    await request(app.getHttpServer())
      .post('/scores/unlock')
      .set(as(examOfficerToken))
      .send({
        classSubjectId: classSubject1Id,
        termId: currentTermId,
        reason: 'Testing maxScore guard',
      })
      .expect(201);
    await request(app.getHttpServer())
      .post('/scores/submit')
      .set(as(teacherAToken))
      .send({
        classSubjectId: classSubject1Id,
        termId: currentTermId,
        entries: [
          { studentId: s1, assessmentComponentId: components.Exam, score: 50 },
        ],
      })
      .expect(201);
    await request(app.getHttpServer())
      .post('/scores/unlock')
      .set(as(examOfficerToken))
      .send({
        classSubjectId: classSubject1Id,
        termId: currentTermId,
        reason: 'Testing maxScore guard',
      })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/assessment-components/${components.Exam}`)
      .set(asAdmin())
      .send({ maxScore: 1 })
      .expect(400);

    // Note: raising it back to (or past) 70 is correctly *also* blocked
    // here — the default (subjectId: null) structure this term is shared
    // by every subject without an override, including the seeded school's
    // real classes, which already have locked submissions against it. A
    // school-wide default is, by design, locked the moment *anyone*
    // anywhere has used it — see assertStructureNotLocked.
  });

  it('reports outstanding subjects until every one is submitted and locked', async () => {
    // Earlier tests may have left classSubject1 locked (from exercising the
    // submit/unlock cycle) — reset directly so this test's full-roster
    // submissions below aren't blocked by leftover lock state.
    await prisma.scoreSubmission.updateMany({
      where: {
        classSubjectId: {
          in: [classSubject1Id, classSubject2Id, classSubject3Id],
        },
      },
      data: { locked: false },
    });

    let status = (
      await request(app.getHttpServer())
        .get(`/results/${armId}/${currentTermId}/status`)
        .set(as(examOfficerToken))
        .expect(200)
    ).body as StatusResponse;
    expect(status.allSubjectsLocked).toBe(false);
    expect(status.outstandingSubjects.length).toBeGreaterThan(0);

    await request(app.getHttpServer())
      .post(`/results/${armId}/${currentTermId}/collate`)
      .set(as(examOfficerToken))
      .expect(400);

    // Finish entering every subject for all 5 students with deliberate ties:
    // subject1: s1&s2 tie at top (95), s3=80, s4=60, s5=40.
    // subject2: s3&s5 tie at top (90), s1=70, s2=60, s4=50.
    // subject3: s1,s2,s3,s4 four-way tie at top (85), s5=40.
    const ids1 = await componentIds();
    const sub2Components = (
      await request(app.getHttpServer())
        .get('/assessment-components')
        .query({ termId: currentTermId, subjectId: subject2Id })
        .set(asAdmin())
        .expect(200)
    ).body as { id: string; name: string }[];
    const ids2 = Object.fromEntries(sub2Components.map((c) => [c.name, c.id]));
    const sub3Components = (
      await request(app.getHttpServer())
        .get('/assessment-components')
        .query({ termId: currentTermId, subjectId: subject3Id })
        .set(asAdmin())
        .expect(200)
    ).body as { id: string; name: string }[];
    const ids3 = Object.fromEntries(sub3Components.map((c) => [c.name, c.id]));

    function entriesFor(
      ids: Record<string, string>,
      scores: Record<string, [number, number, number, number]>,
    ) {
      const entries: {
        studentId: string;
        assessmentComponentId: string;
        score: number;
      }[] = [];
      for (const [studentId, [ca1, ca2, ca3, exam]] of Object.entries(scores)) {
        entries.push({ studentId, assessmentComponentId: ids.CA1, score: ca1 });
        entries.push({ studentId, assessmentComponentId: ids.CA2, score: ca2 });
        entries.push({ studentId, assessmentComponentId: ids.CA3, score: ca3 });
        entries.push({
          studentId,
          assessmentComponentId: ids.Exam,
          score: exam,
        });
      }
      return entries;
    }

    await request(app.getHttpServer())
      .post('/scores/submit')
      .set(as(teacherAToken))
      .send({
        classSubjectId: classSubject1Id,
        termId: currentTermId,
        entries: entriesFor(ids1, {
          [s1]: [10, 10, 10, 65],
          [s2]: [10, 10, 10, 65],
          [s3]: [8, 8, 8, 56],
          [s4]: [6, 6, 6, 42],
          [s5]: [4, 4, 4, 28],
        }),
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/scores/submit')
      .set(as(teacherAToken))
      .send({
        classSubjectId: classSubject2Id,
        termId: currentTermId,
        entries: entriesFor(ids2, {
          [s1]: [7, 7, 7, 49],
          [s2]: [6, 6, 6, 42],
          [s3]: [9, 9, 9, 63],
          [s4]: [5, 5, 5, 35],
          [s5]: [9, 9, 9, 63],
        }),
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/scores/submit')
      .set(as(teacherBToken))
      .send({
        classSubjectId: classSubject3Id,
        termId: currentTermId,
        entries: entriesFor(ids3, {
          [s1]: [8, 9, 8, 60],
          [s2]: [8, 9, 8, 60],
          [s3]: [8, 9, 8, 60],
          [s4]: [8, 9, 8, 60],
          [s5]: [4, 4, 4, 28],
        }),
      })
      .expect(201);

    status = (
      await request(app.getHttpServer())
        .get(`/results/${armId}/${currentTermId}/status`)
        .set(as(examOfficerToken))
        .expect(200)
    ).body as StatusResponse;
    expect(status.allSubjectsLocked).toBe(true);
    expect(status.outstandingSubjects).toHaveLength(0);
  });

  it('collates correct positions/grades/class-averages, including ties, and computes overall ranking independently', async () => {
    await request(app.getHttpServer())
      .post(`/results/${armId}/${currentTermId}/collate`)
      .set(as(examOfficerToken))
      .expect(201);

    const broadsheet = (
      await request(app.getHttpServer())
        .get(`/results/${armId}/${currentTermId}/broadsheet`)
        .set(as(examOfficerToken))
        .expect(200)
    ).body as BroadsheetResponse;
    expect(broadsheet.status.stage).toBe('PENDING_APPROVAL');

    const byStudent = Object.fromEntries(
      broadsheet.rows.map((r) => [r.studentId, r]),
    );
    const bySubject = (studentId: string, name: string) =>
      byStudent[studentId].subjects.find((s) =>
        s.subjectName.startsWith(name),
      )!;

    // Subject1 ties: s1 & s2 both 1st, s3 is 3rd (not 2nd).
    expect(bySubject(s1, 'E2E-Physics').positionInSubject).toBe(1);
    expect(bySubject(s2, 'E2E-Physics').positionInSubject).toBe(1);
    expect(bySubject(s3, 'E2E-Physics').positionInSubject).toBe(3);
    expect(bySubject(s4, 'E2E-Physics').positionInSubject).toBe(4);
    expect(bySubject(s5, 'E2E-Physics').positionInSubject).toBe(5);
    expect(bySubject(s1, 'E2E-Physics').classAverageForSubject).toBeCloseTo(
      74,
      1,
    );

    // Subject2 ties: s3 & s5 both 1st, s1 is 3rd.
    expect(bySubject(s3, 'E2E-Chemistry').positionInSubject).toBe(1);
    expect(bySubject(s5, 'E2E-Chemistry').positionInSubject).toBe(1);
    expect(bySubject(s1, 'E2E-Chemistry').positionInSubject).toBe(3);
    expect(bySubject(s1, 'E2E-Chemistry').classAverageForSubject).toBeCloseTo(
      72,
      1,
    );

    // Subject3: four-way tie at 1st, s5 alone in 5th.
    for (const id of [s1, s2, s3, s4]) {
      expect(bySubject(id, 'E2E-Biology').positionInSubject).toBe(1);
    }
    expect(bySubject(s5, 'E2E-Biology').positionInSubject).toBe(5);

    // Overall: s3 wins despite only tying for 1st in 2 of 3 subjects —
    // averages are (s1=83.33, s2=80.0, s3=85.0, s4=65.0, s5=56.67).
    expect(byStudent[s3].overallPosition).toBe(1);
    expect(byStudent[s1].overallPosition).toBe(2);
    expect(byStudent[s2].overallPosition).toBe(3);
    expect(byStudent[s4].overallPosition).toBe(4);
    expect(byStudent[s5].overallPosition).toBe(5);
    expect(byStudent[s3].overallAverage).toBeCloseTo(85.0, 1);
    expect(byStudent[s1].overallAverage).toBeCloseTo(83.33, 1);
    expect(byStudent[s5].overallAverage).toBeCloseTo(56.67, 1);
    expect(byStudent[s1].classSize).toBe(5);
  });

  it('rejects conduct ratings from a non-class-teacher and an invalid category, accepts from the Class Teacher and Admin', async () => {
    await request(app.getHttpServer())
      .post(`/results/${armId}/${currentTermId}/students/${s1}/conduct`)
      .set(as(teacherAToken))
      .send({
        ratings: [{ domain: 'AFFECTIVE', category: 'Punctuality', score: 4 }],
      })
      .expect(403);

    await request(app.getHttpServer())
      .post(`/results/${armId}/${currentTermId}/students/${s1}/conduct`)
      .set(as(classTeacherToken))
      .send({
        ratings: [
          { domain: 'AFFECTIVE', category: 'NotARealCategory', score: 4 },
        ],
      })
      .expect(400);

    await request(app.getHttpServer())
      .post(`/results/${armId}/${currentTermId}/students/${s1}/conduct`)
      .set(as(classTeacherToken))
      .send({
        ratings: [
          { domain: 'AFFECTIVE', category: 'Punctuality', score: 5 },
          { domain: 'PSYCHOMOTOR', category: 'Handwriting', score: 4 },
        ],
        formTeacherComment: 'Great term.',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/results/${armId}/${currentTermId}/students/${s2}/conduct`)
      .set(asAdmin())
      .send({
        ratings: [{ domain: 'AFFECTIVE', category: 'Leadership', score: 3 }],
      })
      .expect(201);
  });

  it('enforces approve/return/publish stage guards and records a return reason', async () => {
    // Already PENDING_APPROVAL from the collate test above.
    await request(app.getHttpServer())
      .post(`/results/${armId}/${currentTermId}/publish`)
      .set(asAdmin())
      .expect(400); // can't publish before approval

    await request(app.getHttpServer())
      .post(`/results/${armId}/${currentTermId}/generate-report-cards`)
      .set(asAdmin())
      .expect(400); // can't manually generate report cards before publish either

    const returned = await request(app.getHttpServer())
      .post(`/results/${armId}/${currentTermId}/return`)
      .set(asAdmin())
      .send({ reason: 'Please double check Chemistry scores' })
      .expect(201);
    expect((returned.body as { stage: string }).stage).toBe('RETURNED');

    await request(app.getHttpServer())
      .post(`/results/${armId}/${currentTermId}/approve`)
      .set(asAdmin())
      .expect(400); // can't approve from RETURNED directly

    const status = (
      await request(app.getHttpServer())
        .get(`/results/${armId}/${currentTermId}/status`)
        .set(as(examOfficerToken))
        .expect(200)
    ).body as StatusResponse;
    expect(status.stage).toBe('RETURNED');
    expect(status.returnReason).toBe('Please double check Chemistry scores');

    await request(app.getHttpServer())
      .post(`/results/${armId}/${currentTermId}/collate`)
      .set(as(examOfficerToken))
      .expect(201);

    await request(app.getHttpServer())
      .patch(
        `/results/${armId}/${currentTermId}/students/${s1}/principal-comment`,
      )
      .set(asAdmin())
      .send({ principalComment: 'Endorsed.' })
      .expect(200);

    await request(app.getHttpServer())
      .post(`/results/${armId}/${currentTermId}/approve`)
      .set(asAdmin())
      .expect(201);
  });

  it('publishes and enqueues report-card generation for every active student', async () => {
    const published = await request(app.getHttpServer())
      .post(`/results/${armId}/${currentTermId}/publish`)
      .set(asAdmin())
      .expect(201);
    expect((published.body as { stage: string }).stage).toBe('PUBLISHED');

    // Generous budget — Puppeteer launches one fresh browser per job, and
    // running the whole e2e suite in parallel (multiple Jest workers, each
    // booting their own Nest app) contends for CPU, so this can take much
    // longer than it does in isolation.
    let ready = 0;
    for (
      let attempt = 0;
      attempt < 100 && ready < studentIds.length;
      attempt++
    ) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const results = await prisma.studentTermResult.findMany({
        where: { termId: currentTermId, studentId: { in: studentIds } },
      });
      ready = results.filter((r) => r.reportCardUrl).length;
    }
    expect(ready).toBe(studentIds.length);

    const result = await prisma.studentTermResult.findFirstOrThrow({
      where: { studentId: s1, termId: currentTermId },
    });
    expect(result.reportCardUrl).toMatch(/^http/);
    expect(result.reportCardGeneratedAt).toBeTruthy();
  }, 120000);

  it('blocks conduct/comment edits once published, and reopening (return from PUBLISHED) re-allows them', async () => {
    // Conduct ratings and the principal's comment must not be silently
    // editable once a result has gone out to students/parents — otherwise
    // the on-screen preview could drift from the already-generated PDF
    // with no audit trail at all.
    await request(app.getHttpServer())
      .post(`/results/${armId}/${currentTermId}/students/${s1}/conduct`)
      .set(as(classTeacherToken))
      .send({
        ratings: [{ domain: 'AFFECTIVE', category: 'Punctuality', score: 3 }],
      })
      .expect(400);
    await request(app.getHttpServer())
      .patch(
        `/results/${armId}/${currentTermId}/students/${s1}/principal-comment`,
      )
      .set(asAdmin())
      .send({ principalComment: 'Edited after publish — should be rejected.' })
      .expect(400);

    // Reopening from PUBLISHED (not just PENDING_APPROVAL) is the fix —
    // previously there was no way back once a result was approved or
    // published at all.
    const reopened = await request(app.getHttpServer())
      .post(`/results/${armId}/${currentTermId}/return`)
      .set(asAdmin())
      .send({
        reason: 'Found a transposed score after publishing — fixing it.',
      })
      .expect(201);
    expect((reopened.body as { stage: string }).stage).toBe('RETURNED');

    // A student/parent must immediately lose access once reopened — the
    // gate checks live stage, not a cached "was published" flag. This
    // fixture's students have no login credentials by default (created
    // via POST /students with no email/password), so give s1 one here.
    const studentEmail = `student1.${RUN_ID}@students.demoschool.ng`;
    await prisma.student.update({
      where: { id: s1 },
      data: {
        email: studentEmail,
        passwordHash: await bcrypt.hash(PASSWORD, 10),
      },
    });
    const studentToken = await loginAndGetToken(studentEmail);
    await request(app.getHttpServer())
      .get(`/results/${armId}/${currentTermId}/students/${s1}/report-card-data`)
      .set(as(studentToken))
      .expect(403);

    // Now editable again.
    await request(app.getHttpServer())
      .post(`/results/${armId}/${currentTermId}/students/${s1}/conduct`)
      .set(as(classTeacherToken))
      .send({
        ratings: [{ domain: 'AFFECTIVE', category: 'Punctuality', score: 5 }],
      })
      .expect(201);

    // Re-collate -> approve -> publish again, completing the round trip.
    await request(app.getHttpServer())
      .post(`/results/${armId}/${currentTermId}/collate`)
      .set(as(examOfficerToken))
      .expect(201);
    await request(app.getHttpServer())
      .post(`/results/${armId}/${currentTermId}/approve`)
      .set(asAdmin())
      .expect(201);
    const republished = await request(app.getHttpServer())
      .post(`/results/${armId}/${currentTermId}/publish`)
      .set(asAdmin())
      .expect(201);
    expect((republished.body as { stage: string }).stage).toBe('PUBLISHED');
  });

  it('rejects a chronic-absenteeism-style privileged-only endpoint for an unrelated role (sanity check on Roles guard wiring)', async () => {
    await request(app.getHttpServer())
      .get(`/results/${armId}/${currentTermId}/broadsheet`)
      .set(as(bursarToken))
      .expect(403);
  });
});
