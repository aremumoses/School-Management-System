import { INestApplication, ValidationPipe } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
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

interface AttendanceRecordResponse {
  id: string;
  studentId: string;
  status: string;
  classSubjectId: string | null;
}

interface AttendanceSummaryResponse {
  total: number;
  PRESENT: number;
  ABSENT: number;
  LATE: number;
  EXCUSED: number;
  ON_LEAVE: number;
  percentage: number;
}

interface ChronicAbsenteeismEntryResponse {
  studentId: string;
  absenceRate: number;
  student?: { admissionNumber: string };
}

describe('Attendance (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let eventEmitter: EventEmitter2;
  let adminToken: string;

  let classId: string;
  let armAId: string; // owned by classTeacher
  let armBId: string; // NOT owned by classTeacher — used for the rejection test
  let subjectId: string;
  let classSubjectId: string;
  let currentTermId: string;

  let classTeacherId: string;
  let classTeacherToken: string;
  let subjectTeacherId: string;
  let subjectTeacherToken: string;
  let unassignedSubjectTeacherId: string;
  let unassignedSubjectTeacherToken: string;
  let bursarToken: string;

  const studentIds: string[] = [];
  let student1Id: string;
  let student2Id: string;
  let student3Id: string;

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
    eventEmitter = moduleFixture.get(EventEmitter2);

    const server = app.getHttpServer();
    adminToken = await loginAndGetToken(ADMIN_EMAIL);
    bursarToken = await loginAndGetToken('bursar@demoschool.ng');

    currentTermId = (
      (await request(server).get('/terms/current').set(asAdmin()))
        .body as IdResponse
    ).id;

    const classRes = await request(server)
      .post('/classes')
      .set(asAdmin())
      .send({ name: `ATT-${RUN_ID}`, level: 95 })
      .expect(201);
    classId = (classRes.body as IdResponse).id;

    armAId = (
      (
        await request(server)
          .post(`/classes/${classId}/arms`)
          .set(asAdmin())
          .send({ name: 'Core' })
          .expect(201)
      ).body as IdResponse
    ).id;
    armBId = (
      (
        await request(server)
          .post(`/classes/${classId}/arms`)
          .set(asAdmin())
          .send({ name: 'Other' })
          .expect(201)
      ).body as IdResponse
    ).id;

    subjectId = (
      (
        await request(server)
          .post('/subjects')
          .set(asAdmin())
          .send({ name: `AttSubj-${RUN_ID}` })
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

    // Class Teacher — owns armA.
    classTeacherId = (
      (
        await request(server)
          .post('/staff')
          .set(asAdmin())
          .send({
            firstName: 'Class',
            lastName: `Teacher${RUN_ID}`,
            email: `classteacher.${RUN_ID}@demoschool.ng`,
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
      `classteacher.${RUN_ID}@demoschool.ng`,
    );

    // Subject Teacher — assigned to classSubjectId for the current term.
    subjectTeacherId = (
      (
        await request(server)
          .post('/staff')
          .set(asAdmin())
          .send({
            firstName: 'Subject',
            lastName: `Teacher${RUN_ID}`,
            email: `subjectteacher.${RUN_ID}@demoschool.ng`,
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
      `subjectteacher.${RUN_ID}@demoschool.ng`,
    );

    // A second Subject Teacher with NO assignment — used for the rejection test.
    unassignedSubjectTeacherId = (
      (
        await request(server)
          .post('/staff')
          .set(asAdmin())
          .send({
            firstName: 'Unassigned',
            lastName: `Teacher${RUN_ID}`,
            email: `unassigned.${RUN_ID}@demoschool.ng`,
            password: PASSWORD,
            roles: ['SUBJECT_TEACHER'],
          })
          .expect(201)
      ).body as IdResponse
    ).id;
    unassignedSubjectTeacherToken = await loginAndGetToken(
      `unassigned.${RUN_ID}@demoschool.ng`,
    );

    // Three students, all actively enrolled in armA for the current term.
    for (let i = 0; i < 3; i++) {
      const studentId = (
        (
          await request(server)
            .post('/students')
            .set(asAdmin())
            .send({
              firstName: 'Att',
              lastName: `Student${i}${RUN_ID}`,
              dateOfBirth: '2012-01-01',
              gender: 'MALE',
            })
            .expect(201)
        ).body as IdResponse
      ).id;
      await request(server)
        .post(`/students/${studentId}/enrollments`)
        .set(asAdmin())
        .send({ classId, armId: armAId, termId: currentTermId })
        .expect(201);
      studentIds.push(studentId);
    }
    [student1Id, student2Id, student3Id] = studentIds;
  });

  afterAll(async () => {
    // Every statement is independently `.catch(() => undefined)`-ed — an
    // assertion failure partway through a test still runs this afterAll,
    // but a row that test's OWN cleanup never got to (e.g. summaryStudentId
    // below, only added to `studentIds` for exactly this reason) must not
    // let one failed delete here abort the rest, which previously turned a
    // single failed assertion into a hard "Test suite failed to run" via an
    // FK violation on a staff delete — see students.e2e-spec.ts's afterAll
    // for the first time this exact failure mode showed up.
    await prisma.attendance
      .deleteMany({ where: { studentId: { in: studentIds } } })
      .catch(() => undefined);
    await prisma.enrollment
      .deleteMany({ where: { studentId: { in: studentIds } } })
      .catch(() => undefined);
    await prisma.student
      .deleteMany({ where: { id: { in: studentIds } } })
      .catch(() => undefined);

    await prisma.teacherAssignment
      .deleteMany({
        where: {
          staffId: { in: [subjectTeacherId, unassignedSubjectTeacherId] },
        },
      })
      .catch(() => undefined);
    await prisma.classSubject
      .delete({ where: { id: classSubjectId } })
      .catch(() => undefined);
    await prisma.subject
      .delete({ where: { id: subjectId } })
      .catch(() => undefined);

    // .filter(Boolean) — an undefined entry here (an earlier beforeAll
    // step that never reached its assignment) would make deleteMany's
    // `where: { staffId }` collapse to `{}` and wipe that table for
    // EVERY staff member in the database, not just this fixture's.
    for (const staffId of [
      classTeacherId,
      subjectTeacherId,
      unassignedSubjectTeacherId,
    ].filter(Boolean)) {
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

    await prisma.arm.delete({ where: { id: armAId } }).catch(() => undefined);
    await prisma.arm.delete({ where: { id: armBId } }).catch(() => undefined);
    await prisma.class
      .delete({ where: { id: classId } })
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

  it('marks a whole class present in one call, then overrides one student as an exception without duplicating rows', async () => {
    const server = app.getHttpServer();
    const date = '2026-06-01';

    const markAllRes = await request(server)
      .post('/attendance/mark')
      .set(as(classTeacherToken))
      .send({ armId: armAId, date })
      .expect(201);
    expect(markAllRes.body).toEqual({ marked: 3 });

    const afterMarkAll = await request(server)
      .get(`/attendance/class/${armAId}`)
      .query({ date })
      .set(asAdmin())
      .expect(200);
    const recordsAfterMarkAll = afterMarkAll.body as AttendanceRecordResponse[];
    expect(recordsAfterMarkAll).toHaveLength(3);
    expect(recordsAfterMarkAll.every((r) => r.status === 'PRESENT')).toBe(true);

    await request(server)
      .post('/attendance/mark')
      .set(as(classTeacherToken))
      .send({
        armId: armAId,
        date,
        entries: [{ studentId: student2Id, status: 'ABSENT' }],
      })
      .expect(201);

    const afterException = await request(server)
      .get(`/attendance/class/${armAId}`)
      .query({ date })
      .set(asAdmin())
      .expect(200);
    const recordsAfterException =
      afterException.body as AttendanceRecordResponse[];
    // Still 3 rows, not 4 — the second call updated student2's row in place.
    expect(recordsAfterException).toHaveLength(3);
    const student2Record = recordsAfterException.find(
      (r) => r.studentId === student2Id,
    );
    expect(student2Record?.status).toBe('ABSENT');
    expect(
      recordsAfterException
        .filter((r) => r.studentId !== student2Id)
        .every((r) => r.status === 'PRESENT'),
    ).toBe(true);
  });

  it('rejects a Class Teacher marking an arm they are not the Class Teacher of', async () => {
    const server = app.getHttpServer();
    await request(server)
      .post('/attendance/mark')
      .set(as(classTeacherToken))
      .send({ armId: armBId, date: '2026-06-01' })
      .expect(403);
  });

  it('rejects a Subject Teacher with no current-term assignment from marking per-period attendance', async () => {
    const server = app.getHttpServer();
    await request(server)
      .post('/attendance/mark')
      .set(as(unassignedSubjectTeacherToken))
      .send({
        armId: armAId,
        classSubjectId,
        date: '2026-06-01',
        entries: [{ studentId: student1Id, status: 'PRESENT' }],
      })
      .expect(403);
  });

  it('lets an assigned Subject Teacher mark per-period attendance independently of the whole-day record', async () => {
    const server = app.getHttpServer();
    const date = '2026-06-01'; // same day as the whole-day marks above

    await request(server)
      .post('/attendance/mark')
      .set(as(subjectTeacherToken))
      .send({
        armId: armAId,
        classSubjectId,
        date,
        entries: [{ studentId: student1Id, status: 'LATE' }],
      })
      .expect(201);

    const periodRecords = (
      await request(server)
        .get(`/attendance/class/${armAId}`)
        .query({ date, classSubjectId })
        .set(asAdmin())
        .expect(200)
    ).body as AttendanceRecordResponse[];
    expect(periodRecords).toHaveLength(1);
    expect(periodRecords[0]).toMatchObject({
      studentId: student1Id,
      status: 'LATE',
    });

    // The whole-day register for the same date is untouched — student1 is
    // still PRESENT there, proving the two are stored as separate rows.
    const dailyRecords = (
      await request(server)
        .get(`/attendance/class/${armAId}`)
        .query({ date })
        .set(asAdmin())
        .expect(200)
    ).body as AttendanceRecordResponse[];
    expect(dailyRecords).toHaveLength(3);
    expect(dailyRecords.find((r) => r.studentId === student1Id)?.status).toBe(
      'PRESENT',
    );
  });

  it('rejects marking a student who is not actively enrolled in the class', async () => {
    const server = app.getHttpServer();
    await request(server)
      .post('/attendance/mark')
      .set(as(classTeacherToken))
      .send({
        armId: armAId,
        date: '2026-06-01',
        entries: [{ studentId: 'not-a-real-student-id', status: 'PRESENT' }],
      })
      .expect(400);
  });

  it('lets an ADMIN mark attendance for any class, bypassing ownership/assignment checks', async () => {
    const server = app.getHttpServer();
    const date = '2026-06-02';
    await request(server)
      .post('/attendance/mark')
      .set(asAdmin())
      .send({
        armId: armAId,
        date,
        entries: [{ studentId: student3Id, status: 'EXCUSED' }],
      })
      .expect(201);

    const records = (
      await request(server)
        .get(`/attendance/class/${armAId}`)
        .query({ date })
        .set(asAdmin())
        .expect(200)
    ).body as AttendanceRecordResponse[];
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      studentId: student3Id,
      status: 'EXCUSED',
    });
  });

  it('computes correct present/absent/late counts and percentage in the summary endpoint', async () => {
    const server = app.getHttpServer();

    // A dedicated, freshly-enrolled student with a fully isolated history —
    // avoids any coupling to marks made by earlier tests in this file.
    const summaryStudentId = (
      (
        await request(server)
          .post('/students')
          .set(asAdmin())
          .send({
            firstName: 'Summary',
            lastName: `Student${RUN_ID}`,
            dateOfBirth: '2012-01-01',
            gender: 'FEMALE',
          })
          .expect(201)
      ).body as IdResponse
    ).id;
    // Registered in the describe-level cleanup list (not a local
    // `prisma.student.delete()` at the end of this test) so it's still
    // removed even if an assertion below throws first — a local cleanup
    // statement after the assertions would never run on failure, and a
    // FEMALE student lingering with these exact 5 marked days bit a
    // previous run of this file via a P2003 in the outer afterAll once
    // already (see that afterAll's comment).
    studentIds.push(summaryStudentId);
    await request(server)
      .post(`/students/${summaryStudentId}/enrollments`)
      .set(asAdmin())
      .send({ classId, armId: armAId, termId: currentTermId })
      .expect(201);

    const days: [string, string][] = [
      ['2026-06-08', 'PRESENT'],
      ['2026-06-09', 'PRESENT'],
      ['2026-06-10', 'PRESENT'],
      ['2026-06-11', 'ABSENT'],
      ['2026-06-12', 'LATE'],
    ];
    for (const [date, status] of days) {
      await request(server)
        .post('/attendance/mark')
        .set(as(classTeacherToken))
        .send({
          armId: armAId,
          date,
          entries: [{ studentId: summaryStudentId, status }],
        })
        .expect(201);
    }

    const summary = (
      await request(server)
        .get('/attendance/summary')
        .query({ studentId: summaryStudentId, termId: currentTermId })
        .set(asAdmin())
        .expect(200)
    ).body as AttendanceSummaryResponse;
    expect(summary).toMatchObject({
      total: 5,
      PRESENT: 3,
      ABSENT: 1,
      LATE: 1,
      EXCUSED: 0,
      ON_LEAVE: 0,
      // (PRESENT + LATE) / total — counts a tardy arrival as having
      // attended; see attendance.service.ts's getAttendanceSummary comment.
      percentage: 80,
    });
  });

  it('flags the seeded chronically-absent student, respecting the threshold', async () => {
    const server = app.getHttpServer();

    const lowThreshold = (
      await request(server)
        .get('/attendance/chronic-absenteeism')
        .query({ termId: currentTermId, threshold: 20 })
        .set(asAdmin())
        .expect(200)
    ).body as ChronicAbsenteeismEntryResponse[];
    const flagged = lowThreshold.find(
      (e) => e.student?.admissionNumber === 'STU2025007',
    );
    expect(flagged).toBeDefined();
    expect(flagged!.absenceRate).toBeGreaterThan(20);

    const highThreshold = (
      await request(server)
        .get('/attendance/chronic-absenteeism')
        .query({ termId: currentTermId, threshold: 60 })
        .set(asAdmin())
        .expect(200)
    ).body as ChronicAbsenteeismEntryResponse[];
    expect(
      highThreshold.find((e) => e.student?.admissionNumber === 'STU2025007'),
    ).toBeUndefined();

    await request(server)
      .get('/attendance/chronic-absenteeism')
      .query({ termId: currentTermId, threshold: 20 })
      .set(as(bursarToken))
      .expect(403);
  });

  it('excludes a deactivated student from the chronic-absenteeism list', async () => {
    const server = app.getHttpServer();

    const deactivatedStudentId = (
      (
        await request(server)
          .post('/students')
          .set(asAdmin())
          .send({
            firstName: 'Deactivated',
            lastName: `Student${RUN_ID}`,
            dateOfBirth: '2012-01-01',
            gender: 'MALE',
          })
          .expect(201)
      ).body as IdResponse
    ).id;
    studentIds.push(deactivatedStudentId);
    await request(server)
      .post(`/students/${deactivatedStudentId}/enrollments`)
      .set(asAdmin())
      .send({ classId, armId: armAId, termId: currentTermId })
      .expect(201);

    for (const date of ['2026-06-20', '2026-06-21', '2026-06-22']) {
      await request(server)
        .post('/attendance/mark')
        .set(asAdmin())
        .send({
          armId: armAId,
          date,
          entries: [{ studentId: deactivatedStudentId, status: 'ABSENT' }],
        })
        .expect(201);
    }

    const whileActive = (
      await request(server)
        .get('/attendance/chronic-absenteeism')
        .query({ termId: currentTermId, threshold: 50 })
        .set(asAdmin())
        .expect(200)
    ).body as ChronicAbsenteeismEntryResponse[];
    expect(
      whileActive.find((e) => e.studentId === deactivatedStudentId),
    ).toBeDefined();

    await request(server)
      .delete(`/students/${deactivatedStudentId}`)
      .set(asAdmin())
      .expect(204);

    const afterDeactivation = (
      await request(server)
        .get('/attendance/chronic-absenteeism')
        .query({ termId: currentTermId, threshold: 50 })
        .set(asAdmin())
        .expect(200)
    ).body as ChronicAbsenteeismEntryResponse[];
    expect(
      afterDeactivation.find((e) => e.studentId === deactivatedStudentId),
    ).toBeUndefined();
  });

  it('rejects a classSubjectId in GET /attendance/class that does not belong to the arm’s class', async () => {
    const server = app.getHttpServer();

    const otherClassId = (
      (
        await request(server)
          .post('/classes')
          .set(asAdmin())
          .send({ name: `OtherClass-${RUN_ID}`, level: 94 })
          .expect(201)
      ).body as IdResponse
    ).id;
    const otherSubjectId = (
      (
        await request(server)
          .post('/subjects')
          .set(asAdmin())
          .send({ name: `OtherSubj-${RUN_ID}` })
          .expect(201)
      ).body as IdResponse
    ).id;
    const otherClassSubjectId = (
      (
        await request(server)
          .post(`/subjects/${otherSubjectId}/classes`)
          .set(asAdmin())
          .send({ classId: otherClassId })
          .expect(201)
      ).body as IdResponse
    ).id;

    await request(server)
      .get(`/attendance/class/${armAId}`)
      .query({ date: '2026-06-01', classSubjectId: otherClassSubjectId })
      .set(asAdmin())
      .expect(400);

    await prisma.classSubject.delete({ where: { id: otherClassSubjectId } });
    await prisma.subject.delete({ where: { id: otherSubjectId } });
    await prisma.class.delete({ where: { id: otherClassId } });
  });

  it('authorizes a Subject Teacher against the term a request actually concerns, not just whichever term is current', async () => {
    const server = app.getHttpServer();

    // A dedicated student enrolled *only* in the past term below — reusing
    // student1Id (already ACTIVE in the current term) would hit the
    // "at most one ACTIVE enrollment per student" invariant from Stage 3
    // when enrolling them into a second term too.
    const pastStudentId = (
      (
        await request(server)
          .post('/students')
          .set(asAdmin())
          .send({
            firstName: 'PastTerm',
            lastName: `Student${RUN_ID}`,
            dateOfBirth: '2012-01-01',
            gender: 'MALE',
          })
          .expect(201)
      ).body as IdResponse
    ).id;
    studentIds.push(pastStudentId);

    // A term entirely disjoint from the seeded current term, so date-based
    // term resolution unambiguously picks it.
    const pastSessionRes = await request(server)
      .post('/academic-sessions')
      .set(asAdmin())
      .send({
        name: `Past-${RUN_ID}`,
        terms: [
          { name: 'Past Term', startDate: '2020-01-01', endDate: '2020-01-31' },
        ],
      })
      .expect(201);
    const pastSessionId = (pastSessionRes.body as IdResponse).id;
    const pastTermId = (pastSessionRes.body as { terms: IdResponse[] }).terms[0]
      .id;

    try {
      await request(server)
        .post(`/students/${pastStudentId}/enrollments`)
        .set(asAdmin())
        .send({ classId, armId: armAId, termId: pastTermId })
        .expect(201);

      // unassignedSubjectTeacherToken has NO current-term assignment at
      // all (see its setup in beforeAll) — assign them for the PAST term
      // only.
      await request(server)
        .post(`/staff/${unassignedSubjectTeacherId}/teaching-assignments`)
        .set(asAdmin())
        .send({ classSubjectId, termId: pastTermId })
        .expect(201);

      // Admin marks a per-period record in the past term — bypasses the
      // assignment check entirely, just need a real row to read back.
      await request(server)
        .post('/attendance/mark')
        .set(asAdmin())
        .send({
          armId: armAId,
          classSubjectId,
          date: '2020-01-15',
          entries: [{ studentId: pastStudentId, status: 'PRESENT' }],
        })
        .expect(201);

      // Can view that past date/class — they WERE assigned for the term
      // it falls in. Under the old "current term only" check this was
      // wrongly denied.
      await request(server)
        .get(`/attendance/class/${armAId}`)
        .query({ date: '2020-01-15', classSubjectId })
        .set(as(unassignedSubjectTeacherToken))
        .expect(200);
      await request(server)
        .get('/attendance/summary')
        .query({ studentId: pastStudentId, termId: pastTermId })
        .set(as(unassignedSubjectTeacherToken))
        .expect(200);

      // Still can't view a CURRENT-term date/summary for the same class —
      // they have no assignment there. Under the old check (which only
      // ever looked at "current term") this could have been wrongly
      // *granted*.
      await request(server)
        .get(`/attendance/class/${armAId}`)
        .query({ date: '2026-06-01', classSubjectId })
        .set(as(unassignedSubjectTeacherToken))
        .expect(403);
      await request(server)
        .get('/attendance/summary')
        .query({ studentId: pastStudentId, termId: currentTermId })
        .set(as(unassignedSubjectTeacherToken))
        .expect(404);
    } finally {
      await prisma.attendance
        .deleteMany({ where: { date: new Date('2020-01-15') } })
        .catch(() => undefined);
      await prisma.teacherAssignment
        .deleteMany({
          where: { staffId: unassignedSubjectTeacherId, termId: pastTermId },
        })
        .catch(() => undefined);
      await prisma.enrollment
        .deleteMany({ where: { termId: pastTermId } })
        .catch(() => undefined);
      await prisma.term
        .delete({ where: { id: pastTermId } })
        .catch(() => undefined);
      await prisma.academicSession
        .delete({ where: { id: pastSessionId } })
        .catch(() => undefined);
    }
  });

  it('the database itself rejects two whole-day attendance rows for the same student+date', async () => {
    const baseData = {
      studentId: student1Id,
      armId: armAId,
      termId: currentTermId,
      date: new Date('2026-06-25'),
      status: 'PRESENT' as const,
      markedByStaffId: classTeacherId,
    };
    await prisma.attendance.create({ data: baseData });
    await expect(
      prisma.attendance.create({ data: baseData }),
    ).rejects.toThrow();

    await prisma.attendance.deleteMany({
      where: { studentId: student1Id, date: new Date('2026-06-25') },
    });
  });

  it('lets a STUDENT and PARENT see only their own/ward attendance, never another student’s', async () => {
    const server = app.getHttpServer();
    const seededStudent = await prisma.student.findFirstOrThrow({
      where: { admissionNumber: 'STU2025001' },
    });
    const studentToken = await loginAndGetToken(seededStudent.email!);
    const guardianToken = await loginAndGetToken(
      'guardian.stu2025001@example.com',
    );

    await request(server)
      .get('/attendance')
      .query({ studentId: seededStudent.id })
      .set(as(studentToken))
      .expect(200);
    await request(server)
      .get('/attendance')
      .query({ studentId: student1Id })
      .set(as(studentToken))
      .expect(404);
    await request(server)
      .get('/attendance/summary')
      .query({ studentId: student1Id, termId: currentTermId })
      .set(as(studentToken))
      .expect(404);
    await request(server)
      .get(`/attendance/class/${armAId}`)
      .query({ date: '2026-06-01' })
      .set(as(studentToken))
      .expect(403);

    await request(server)
      .get('/attendance')
      .query({ studentId: seededStudent.id })
      .set(as(guardianToken))
      .expect(200);
    await request(server)
      .get('/attendance')
      .query({ studentId: student1Id })
      .set(as(guardianToken))
      .expect(404);

    await request(server)
      .get('/attendance')
      .query({ studentId: student1Id })
      .set(as(bursarToken))
      .expect(404);
  });

  it('emits an absence/late event for every ABSENT/LATE entry, and not for PRESENT', async () => {
    const server = app.getHttpServer();
    const emitSpy = jest.spyOn(eventEmitter, 'emit');
    emitSpy.mockClear();

    await request(server)
      .post('/attendance/mark')
      .set(as(classTeacherToken))
      .send({
        armId: armAId,
        date: '2026-06-15',
        entries: [
          { studentId: student1Id, status: 'PRESENT' },
          { studentId: student2Id, status: 'ABSENT' },
          { studentId: student3Id, status: 'LATE' },
        ],
      })
      .expect(201);

    const absenceCalls = emitSpy.mock.calls.filter(
      ([event]) => event === 'attendance.absence',
    );
    expect(absenceCalls).toHaveLength(2);
    expect(
      absenceCalls.some(
        ([, payload]) =>
          (payload as { studentId: string; status: string }).studentId ===
            student2Id && (payload as { status: string }).status === 'ABSENT',
      ),
    ).toBe(true);
    expect(
      absenceCalls.some(
        ([, payload]) =>
          (payload as { studentId: string; status: string }).studentId ===
            student3Id && (payload as { status: string }).status === 'LATE',
      ),
    ).toBe(true);
    expect(
      absenceCalls.some(
        ([, payload]) =>
          (payload as { studentId: string }).studentId === student1Id,
      ),
    ).toBe(false);

    emitSpy.mockRestore();
  });
});
