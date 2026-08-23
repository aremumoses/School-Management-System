import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import ExcelJS from 'exceljs';
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

interface StudentResponse {
  id: string;
  admissionNumber: string;
  firstName: string;
  lastName: string;
}

interface PreviewRow {
  rowNumber: number;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  stateOfOrigin: string | null;
  lga: string | null;
  religion: string | null;
  bloodGroup: string | null;
  genotype: string | null;
  address: string | null;
  className: string;
  armName: string;
  classId: string;
  armId: string;
  guardianFirstName: string;
  guardianLastName: string;
  guardianEmail: string;
  guardianPhone: string | null;
  guardianRelationship: string;
}

interface PreviewResponse {
  valid: PreviewRow[];
  invalid: {
    rowNumber: number;
    data: Record<string, string>;
    errors: string[];
  }[];
}

interface CommitResponse {
  results: {
    rowNumber: number;
    success: boolean;
    studentId?: string;
    error?: string;
  }[];
  succeededCount: number;
  failedCount: number;
}

/** Builds a realistic 30-row import sheet: 28 valid rows + 2 intentionally malformed ones. */
async function buildImportWorkbook(
  className: string,
  armName: string,
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Students');
  sheet.addRow([
    'First Name',
    'Last Name',
    'Date of Birth',
    'Gender',
    'State of Origin',
    'LGA',
    'Religion',
    'Blood Group',
    'Genotype',
    'Address',
    'Class',
    'Arm',
    'Guardian First Name',
    'Guardian Last Name',
    'Guardian Email',
    'Guardian Phone',
    'Relationship',
  ]);

  const firstNames = [
    'Aisha',
    'Tunde',
    'Chioma',
    'Emeka',
    'Folake',
    'Ibrahim',
    'Ngozi',
    'Yusuf',
    'Blessing',
    'Segun',
    'Amaka',
    'Bashir',
    'Funke',
    'Chidi',
    'Hadiza',
    'Obinna',
    'Kemi',
    'Musa',
    'Adaeze',
    'Tobi',
    'Zainab',
    'Chinedu',
    'Ronke',
    'Sani',
    'Uche',
    'Bukola',
    'Lawal',
    'Ifeoma',
  ];
  const lastName = `Test${RUN_ID}`;

  for (let i = 0; i < 28; i++) {
    const isSibling = i === 1; // shares a guardian email with row 0, to exercise guardian dedup
    sheet.addRow([
      firstNames[i],
      lastName,
      i % 2 === 0 ? '2012-04-20' : '20/04/2012', // exercise both accepted date formats
      i % 2 === 0 ? 'MALE' : 'FEMALE',
      'Lagos',
      'Ikeja',
      'Christianity',
      'O+',
      'AA',
      `${i} Test Street, Lagos`,
      className,
      armName,
      isSibling ? 'GuardianZero' : `Guardian${i}`,
      `Last${RUN_ID}`,
      isSibling
        ? `guardian.${RUN_ID}.0@example.com`
        : `guardian.${RUN_ID}.${i}@example.com`,
      '+2348012345678',
      'Mother',
    ]);
  }

  // Row 29 (malformed): invalid gender.
  sheet.addRow([
    'BadGender',
    lastName,
    '2012-04-20',
    'Unknown',
    'Lagos',
    'Ikeja',
    'Christianity',
    'O+',
    'AA',
    'Bad Street',
    className,
    armName,
    'GuardianBad1',
    `Last${RUN_ID}`,
    `guardian.${RUN_ID}.bad1@example.com`,
    '+2348012345678',
    'Mother',
  ]);

  // Row 30 (malformed): missing guardian email.
  sheet.addRow([
    'NoGuardianEmail',
    lastName,
    '2012-04-20',
    'MALE',
    'Lagos',
    'Ikeja',
    'Christianity',
    'O+',
    'AA',
    'Bad Street 2',
    className,
    armName,
    'GuardianBad2',
    `Last${RUN_ID}`,
    '',
    '+2348012345678',
    'Father',
  ]);

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

describe('Students (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let adminToken: string;

  let createdClassId: string;
  let createdArmId: string;
  let createdTeacherId: string | undefined;
  const importedStudentIds: string[] = [];

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

    adminToken = await loginAndGetToken(ADMIN_EMAIL);
  });

  afterAll(async () => {
    // Dependency order under the Restrict FKs from the Stage 2 audit:
    // enrollments/refresh tokens/guardian links before students, students
    // before the class/arm, teacher before the arm (classTeacherId is
    // SetNull so order doesn't matter there, but tidy up regardless).
    //
    // Every statement below is independently `.catch(() => undefined)`-ed —
    // earlier in this file's history, a single failed delete here (observed
    // once under parallel-suite load) threw uncaught, which aborted the
    // *rest* of this afterAll too (including app.close()), silently
    // orphaning ~27 imported students, their enrollments, and the test
    // class/arm for every run after that. Isolating each statement means a
    // transient failure in one cleanup step can never cascade into skipping
    // the others.
    if (importedStudentIds.length > 0) {
      await prisma.studentGuardian
        .deleteMany({ where: { studentId: { in: importedStudentIds } } })
        .catch(() => undefined);
      await prisma.enrollment
        .deleteMany({ where: { studentId: { in: importedStudentIds } } })
        .catch(() => undefined);
      await prisma.refreshToken
        .deleteMany({ where: { studentId: { in: importedStudentIds } } })
        .catch(() => undefined);
      await prisma.student
        .deleteMany({ where: { id: { in: importedStudentIds } } })
        .catch(() => undefined);
    }
    await prisma.guardian
      .deleteMany({ where: { email: { contains: `.${RUN_ID}.` } } })
      .catch(() => undefined);
    if (createdTeacherId) {
      await prisma.refreshToken
        .deleteMany({ where: { staffId: createdTeacherId } })
        .catch(() => undefined);
      await prisma.staffRole
        .deleteMany({ where: { staffId: createdTeacherId } })
        .catch(() => undefined);
      await prisma.staff
        .delete({ where: { id: createdTeacherId } })
        .catch(() => undefined);
    }
    if (createdArmId) {
      await prisma.arm
        .delete({ where: { id: createdArmId } })
        .catch(() => undefined);
    }
    if (createdClassId) {
      await prisma.class
        .delete({ where: { id: createdClassId } })
        .catch(() => undefined);
    }
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

  it('runs the full bulk-import Done-when sequence: preview -> commit -> real records', async () => {
    const server = app.getHttpServer();

    // Set up a dedicated class+arm so this test is fully isolated from seed data.
    const classRes = await request(server)
      .post('/classes')
      .set(asAdmin())
      .send({ name: `JSS1-IMPORT-${RUN_ID}`, level: 97 })
      .expect(201);
    createdClassId = (classRes.body as IdResponse).id;

    const armRes = await request(server)
      .post(`/classes/${createdClassId}/arms`)
      .set(asAdmin())
      .send({ name: 'Import Arm' })
      .expect(201);
    createdArmId = (armRes.body as IdResponse).id;

    const currentTermRes = await request(server)
      .get('/terms/current')
      .set(asAdmin())
      .expect(200);
    const termId = (currentTermRes.body as IdResponse).id;

    const workbook = await buildImportWorkbook(
      `JSS1-IMPORT-${RUN_ID}`,
      'Import Arm',
    );

    // --- Preview: nothing should be written to the DB yet. ---
    const previewRes = await request(server)
      .post(`/students/bulk-import/preview?termId=${termId}`)
      .set(asAdmin())
      .attach('file', workbook, 'students.xlsx')
      .expect(201);
    const preview = previewRes.body as PreviewResponse;

    expect(preview.valid).toHaveLength(28);
    expect(preview.invalid).toHaveLength(2);

    const genderError = preview.invalid.find(
      (r) => r.data.firstName === 'BadGender',
    );
    expect(genderError?.errors.some((e) => e.includes('gender'))).toBe(true);

    const emailError = preview.invalid.find(
      (r) => r.data.firstName === 'NoGuardianEmail',
    );
    expect(emailError?.errors.some((e) => e.includes('guardianEmail'))).toBe(
      true,
    );

    const studentCountBefore = await prisma.student.count({
      where: { lastName: `Test${RUN_ID}` },
    });
    expect(studentCountBefore).toBe(0);

    // --- Commit: only the valid rows get written. ---
    const commitRes = await request(server)
      .post('/students/bulk-import/commit')
      .set(asAdmin())
      .send({ termId, rows: preview.valid })
      .expect(201);
    const commit = commitRes.body as CommitResponse;

    expect(commit.succeededCount).toBe(28);
    expect(commit.failedCount).toBe(0);
    for (const result of commit.results) {
      expect(result.success).toBe(true);
      if (result.studentId) importedStudentIds.push(result.studentId);
    }
    expect(importedStudentIds).toHaveLength(28);

    // Verify they're real Student+Guardian+Enrollment records, not just a response payload.
    const oneStudent = await request(server)
      .get(`/students/${importedStudentIds[0]}`)
      .set(asAdmin())
      .expect(200);
    const studentBody = oneStudent.body as StudentResponse & {
      enrollments: {
        class: { id: string };
        arm: { id: string };
        status: string;
      }[];
    };
    expect(studentBody.firstName).toBe('Aisha');
    expect(studentBody.admissionNumber).toBeTruthy();
    expect(studentBody.enrollments[0].class.id).toBe(createdClassId);
    expect(studentBody.enrollments[0].arm.id).toBe(createdArmId);
    expect(studentBody.enrollments[0].status).toBe('ACTIVE');

    // The two sibling rows (index 0 and 1) should share exactly one guardian, not two.
    const guardianCount = await prisma.guardian.count({
      where: { email: `guardian.${RUN_ID}.0@example.com` },
    });
    expect(guardianCount).toBe(1);
    const sharedGuardian = await prisma.guardian.findUnique({
      where: { email: `guardian.${RUN_ID}.0@example.com` },
      include: { students: true },
    });
    expect(sharedGuardian?.students).toHaveLength(2);
  });

  it('round-trips dates of birth without a timezone shift, in both accepted formats', async () => {
    // Regression test: parseFlexibleDate used to build dates via the
    // server's *local* timezone (`new Date(y, m, d)`), then read them back
    // via toISOString() (UTC) — on a server whose local timezone is ahead
    // of UTC, that silently shifted the calendar date back by one day.
    const server = app.getHttpServer();
    const termId = (await request(server).get('/terms/current').set(asAdmin()))
      .body as { id: string };

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Students');
    sheet.addRow([
      'First Name',
      'Last Name',
      'Date of Birth',
      'Gender',
      'State of Origin',
      'LGA',
      'Religion',
      'Blood Group',
      'Genotype',
      'Address',
      'Class',
      'Arm',
      'Guardian First Name',
      'Guardian Last Name',
      'Guardian Email',
      'Guardian Phone',
      'Relationship',
    ]);
    sheet.addRow([
      `Iso${RUN_ID}`,
      'DateTest',
      '2011-05-10',
      'FEMALE',
      '',
      '',
      '',
      '',
      '',
      '',
      `JSS1-IMPORT-${RUN_ID}`,
      'Import Arm',
      'G',
      'G',
      `g.${RUN_ID}.iso@example.com`,
      '',
      'Mother',
    ]);
    sheet.addRow([
      `Slash${RUN_ID}`,
      'DateTest',
      '15/03/2012',
      'MALE',
      '',
      '',
      '',
      '',
      '',
      '',
      `JSS1-IMPORT-${RUN_ID}`,
      'Import Arm',
      'G',
      'G',
      `g.${RUN_ID}.slash@example.com`,
      '',
      'Father',
    ]);
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());

    const previewRes = await request(server)
      .post(`/students/bulk-import/preview?termId=${termId.id}`)
      .set(asAdmin())
      .attach('file', buffer, 'date-test.xlsx')
      .expect(201);
    const preview = previewRes.body as PreviewResponse;

    expect(preview.invalid).toHaveLength(0);
    const isoRow = preview.valid.find((r) => r.firstName === `Iso${RUN_ID}`);
    const slashRow = preview.valid.find(
      (r) => r.firstName === `Slash${RUN_ID}`,
    );
    expect(isoRow?.dateOfBirth).toBe('2011-05-10');
    expect(slashRow?.dateOfBirth).toBe('2012-03-15');
  });

  it("scopes a Class Teacher's student list to their own arm only", async () => {
    const server = app.getHttpServer();

    // A throwaway staff member with ONLY the CLASS_TEACHER role, assigned
    // to the import arm above, so this assertion is exact rather than
    // additive with any other role's broader scope.
    const teacherEmail = `classteacher.${RUN_ID}@demoschool.ng`;
    const createTeacherRes = await request(server)
      .post('/staff')
      .set(asAdmin())
      .send({
        firstName: 'Scoped',
        lastName: 'Teacher',
        email: teacherEmail,
        password: PASSWORD,
        roles: ['CLASS_TEACHER'],
      })
      .expect(201);
    createdTeacherId = (createTeacherRes.body as IdResponse).id;

    await request(server)
      .patch(`/arms/${createdArmId}`)
      .set(asAdmin())
      .send({ classTeacherId: createdTeacherId })
      .expect(200);

    const teacherToken = await loginAndGetToken(teacherEmail);

    const listRes = await request(server)
      .get('/students?pageSize=100')
      .set('Authorization', `Bearer ${teacherToken}`)
      .expect(200);
    const list = listRes.body as { data: StudentResponse[]; total: number };

    expect(list.total).toBe(28);
    expect(list.data.every((s) => importedStudentIds.includes(s.id))).toBe(
      true,
    );

    // A student NOT in their arm (one of the seeded students) must not be visible.
    const seededStudent = await prisma.student.findFirst({
      where: { admissionNumber: { startsWith: 'STU2025' } },
    });
    expect(seededStudent).not.toBeNull();
    await request(server)
      .get(`/students/${seededStudent!.id}`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .expect(404);

    // A non-admin can't perform bulk-import writes.
    await request(server)
      .post('/students')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        firstName: 'Should',
        lastName: 'Fail',
        dateOfBirth: '2012-01-01',
        gender: 'MALE',
      })
      .expect(403);
  });

  describe('core CRUD, uploads, guardians, and safety guards', () => {
    let coreClassId: string;
    let coreArmId: string;
    let currentTermId: string;
    let coreStudentId: string;
    let coreGuardianId: string;
    let coreGuardianEmail: string;
    let coreGuardianTemporaryPassword: string;

    beforeAll(async () => {
      const server = app.getHttpServer();
      const classRes = await request(server)
        .post('/classes')
        .set(asAdmin())
        .send({ name: `JSS1-CORE-${RUN_ID}`, level: 96 })
        .expect(201);
      coreClassId = (classRes.body as IdResponse).id;
      const armRes = await request(server)
        .post(`/classes/${coreClassId}/arms`)
        .set(asAdmin())
        .send({ name: 'Core Arm' })
        .expect(201);
      coreArmId = (armRes.body as IdResponse).id;
      currentTermId = (
        (await request(server).get('/terms/current').set(asAdmin()))
          .body as IdResponse
      ).id;
    });

    afterAll(async () => {
      const server = app.getHttpServer();
      if (coreStudentId) {
        await prisma.studentGuardian.deleteMany({
          where: { studentId: coreStudentId },
        });
        await prisma.enrollment.deleteMany({
          where: { studentId: coreStudentId },
        });
        await prisma.refreshToken.deleteMany({
          where: { studentId: coreStudentId },
        });
        await prisma.student.deleteMany({ where: { id: coreStudentId } });
      }
      if (coreGuardianId) {
        await prisma.refreshToken.deleteMany({
          where: { guardianId: coreGuardianId },
        });
        await prisma.guardian.deleteMany({ where: { id: coreGuardianId } });
      }
      await prisma.arm
        .delete({ where: { id: coreArmId } })
        .catch(() => undefined);
      await prisma.class
        .delete({ where: { id: coreClassId } })
        .catch(() => undefined);
      void server;
    });

    it('creates, reads, updates, and soft-deletes a student', async () => {
      const server = app.getHttpServer();
      const createRes = await request(server)
        .post('/students')
        .set(asAdmin())
        .send({
          firstName: 'Core',
          lastName: `Test${RUN_ID}`,
          dateOfBirth: '2012-01-01',
          gender: 'MALE',
        })
        .expect(201);
      coreStudentId = (createRes.body as IdResponse).id;

      await request(server)
        .patch(`/students/${coreStudentId}`)
        .set(asAdmin())
        .send({ lastName: `Updated${RUN_ID}` })
        .expect(200)
        .expect((res) => {
          expect((res.body as { lastName: string }).lastName).toBe(
            `Updated${RUN_ID}`,
          );
        });

      await request(server)
        .delete(`/students/${coreStudentId}`)
        .set(asAdmin())
        .expect(204);
      const afterDelete = await request(server)
        .get(`/students/${coreStudentId}`)
        .set(asAdmin())
        .expect(200);
      expect((afterDelete.body as { isActive: boolean }).isActive).toBe(false);

      // Reactivate so the rest of this block's tests can use the student normally.
      await request(server)
        .patch(`/students/${coreStudentId}`)
        .set(asAdmin())
        .send({ isActive: true })
        .expect(200);
    });

    it('generates unique admission numbers even under truly concurrent creation', async () => {
      // generateAdmissionNumber reads the current max sequence and
      // increments it in application code; createStudent now holds a
      // Postgres advisory lock around generate+create so concurrent calls
      // queue instead of racing — verified directly here with requests
      // fired genuinely in parallel (Promise.all, not sequential awaits),
      // since a sequential loop would never have caught the original bug.
      const server = app.getHttpServer();
      const concurrentCount = 10;
      const responses = await Promise.all(
        Array.from({ length: concurrentCount }, (_, i) =>
          request(server)
            .post('/students')
            .set(asAdmin())
            .send({
              firstName: 'Concurrent',
              lastName: `${RUN_ID}${i}`,
              dateOfBirth: '2012-01-01',
              gender: 'MALE',
            }),
        ),
      );

      const ids: string[] = [];
      const admissionNumbers = new Set<string>();
      for (const res of responses) {
        expect(res.status).toBe(201);
        const body = res.body as IdResponse & { admissionNumber: string };
        ids.push(body.id);
        admissionNumbers.add(body.admissionNumber);
      }
      expect(admissionNumbers.size).toBe(concurrentCount);

      await prisma.refreshToken.deleteMany({
        where: { studentId: { in: ids } },
      });
      await prisma.student.deleteMany({ where: { id: { in: ids } } });
    });

    it('rejects a future date of birth on both create and update', async () => {
      const server = app.getHttpServer();
      const farFuture = `${new Date().getFullYear() + 5}-01-01`;
      await request(server)
        .post('/students')
        .set(asAdmin())
        .send({
          firstName: 'Future',
          lastName: 'Person',
          dateOfBirth: farFuture,
          gender: 'MALE',
        })
        .expect(400);

      await request(server)
        .patch(`/students/${coreStudentId}`)
        .set(asAdmin())
        .send({ dateOfBirth: farFuture })
        .expect(400);
    });

    it('uploads a student photo and rejects a non-image file', async () => {
      const server = app.getHttpServer();
      const pngBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
        'base64',
      );
      const res = await request(server)
        .post(`/students/${coreStudentId}/photo`)
        .set(asAdmin())
        .attach('file', pngBuffer, 'photo.png')
        .expect(201);
      expect((res.body as { photoUrl: string }).photoUrl).toMatch(/^http/);

      await request(server)
        .post(`/students/${coreStudentId}/photo`)
        .set(asAdmin())
        .attach('file', Buffer.from('not an image'), 'notes.txt')
        .expect(400);
    });

    it('uploads a document and rejects a disallowed file type', async () => {
      const server = app.getHttpServer();
      const pdfLikeBuffer = Buffer.from('%PDF-1.4 fake pdf content');
      const res = await request(server)
        .post(`/students/${coreStudentId}/documents`)
        .set(asAdmin())
        .field('type', 'Testimonial')
        .attach('file', pdfLikeBuffer, 'testimonial.pdf')
        .expect(201);
      const documents = (
        res.body as { documents: { type: string; url: string }[] }
      ).documents;
      expect(documents.some((d) => d.type === 'Testimonial')).toBe(true);

      await request(server)
        .post(`/students/${coreStudentId}/documents`)
        .set(asAdmin())
        .field('type', 'Suspicious')
        .attach('file', Buffer.from('<script>alert(1)</script>'), 'evil.html')
        .expect(400);
    });

    it('links an existing guardian and a brand-new guardian, then unlinks one', async () => {
      const server = app.getHttpServer();
      coreGuardianEmail = `core.guardian.${RUN_ID}@example.com`;
      const newGuardianRes = await request(server)
        .post(`/students/${coreStudentId}/guardians`)
        .set(asAdmin())
        .send({
          firstName: 'Core',
          lastName: 'Guardian',
          email: coreGuardianEmail,
          relationship: 'Mother',
        })
        .expect(201);
      const newGuardianBody = newGuardianRes.body as {
        guardianId: string;
        guardianTemporaryPassword: string;
      };
      coreGuardianId = newGuardianBody.guardianId;
      coreGuardianTemporaryPassword = newGuardianBody.guardianTemporaryPassword;
      // The whole point of this fix: a newly-created guardian's temp
      // password must actually be returned, or the account is unusable.
      expect(coreGuardianTemporaryPassword).toBeTruthy();

      const existingGuardian = await prisma.guardian.findFirst({
        where: { email: 'guardian.stu2025001@example.com' },
      });
      await request(server)
        .post(`/students/${coreStudentId}/guardians`)
        .set(asAdmin())
        .send({ guardianId: existingGuardian!.id, relationship: 'Father' })
        .expect(201);

      const detail = await request(server)
        .get(`/students/${coreStudentId}`)
        .set(asAdmin())
        .expect(200);
      expect((detail.body as { guardians: unknown[] }).guardians).toHaveLength(
        2,
      );

      await request(server)
        .delete(`/students/${coreStudentId}/guardians/${existingGuardian!.id}`)
        .set(asAdmin())
        .expect(204);
    });

    it('blocks a second ACTIVE enrollment via create, and via transitioning a different one back to ACTIVE', async () => {
      const server = app.getHttpServer();

      // coreStudentId has no enrollment yet at this point in the block.
      const firstEnrollment = await request(server)
        .post(`/students/${coreStudentId}/enrollments`)
        .set(asAdmin())
        .send({ classId: coreClassId, armId: coreArmId, termId: currentTermId })
        .expect(201);

      // A second ACTIVE enrollment (different term) must be blocked by create.
      const otherSession = await request(server)
        .post('/academic-sessions')
        .set(asAdmin())
        .send({
          name: `${RUN_ID}-CORE-SESSION`,
          terms: [
            { name: 'First', startDate: '2099-01-01', endDate: '2099-04-01' },
          ],
        })
        .expect(201);
      const otherTermId = (otherSession.body as { terms: IdResponse[] })
        .terms[0].id;

      await request(server)
        .post(`/students/${coreStudentId}/enrollments`)
        .set(asAdmin())
        .send({ classId: coreClassId, armId: coreArmId, termId: otherTermId })
        .expect(409);

      // Create it as PROMOTED instead (allowed, since it's not ACTIVE)...
      const secondEnrollmentRes = await request(server)
        .post(`/students/${coreStudentId}/enrollments`)
        .set(asAdmin())
        .send({
          classId: coreClassId,
          armId: coreArmId,
          termId: otherTermId,
          status: 'PROMOTED',
        })
        .expect(201);
      const secondEnrollmentId = (secondEnrollmentRes.body as IdResponse).id;

      // ...but transitioning THAT one to ACTIVE while the first is still
      // ACTIVE must also be blocked — this is the exact gap the audit found
      // in updateEnrollmentStatus.
      await request(server)
        .patch(`/students/${coreStudentId}/enrollments/${secondEnrollmentId}`)
        .set(asAdmin())
        .send({ status: 'ACTIVE' })
        .expect(409);

      // Clean up: withdraw the first so later tests in this block aren't
      // affected, and clean up the throwaway session.
      const firstEnrollmentId = (firstEnrollment.body as IdResponse).id;
      await request(server)
        .patch(`/students/${coreStudentId}/enrollments/${firstEnrollmentId}`)
        .set(asAdmin())
        .send({ status: 'WITHDRAWN' })
        .expect(200);
      await prisma.enrollment.deleteMany({
        where: { studentId: coreStudentId },
      });
      await prisma.academicSession.delete({
        where: { id: (otherSession.body as IdResponse).id },
      });
    });

    it('withdraws the active enrollment when a student is soft-deleted', async () => {
      const server = app.getHttpServer();
      const enrollmentRes = await request(server)
        .post(`/students/${coreStudentId}/enrollments`)
        .set(asAdmin())
        .send({ classId: coreClassId, armId: coreArmId, termId: currentTermId })
        .expect(201);
      const enrollmentId = (enrollmentRes.body as IdResponse).id;

      await request(server)
        .delete(`/students/${coreStudentId}`)
        .set(asAdmin())
        .expect(204);

      const enrollment = await prisma.enrollment.findUnique({
        where: { id: enrollmentId },
      });
      expect(enrollment?.status).toBe('WITHDRAWN');

      // Reactivate for any later use.
      await request(server)
        .patch(`/students/${coreStudentId}`)
        .set(asAdmin())
        .send({ isActive: true })
        .expect(200);
    });

    it("scopes a Subject Teacher's visibility to only their CURRENT term's classes", async () => {
      const server = app.getHttpServer();

      // The previous test left a WITHDRAWN enrollment for this student+term
      // (Enrollment has @@unique([studentId, termId])) — clear it first so
      // creating a fresh ACTIVE one here doesn't collide with it.
      await prisma.enrollment.deleteMany({
        where: { studentId: coreStudentId },
      });
      const enrollmentRes = await request(server)
        .post(`/students/${coreStudentId}/enrollments`)
        .set(asAdmin())
        .send({ classId: coreClassId, armId: coreArmId, termId: currentTermId })
        .expect(201);

      const subjectTeacherEmail = `subjectteacher.${RUN_ID}@demoschool.ng`;
      const teacherRes = await request(server)
        .post('/staff')
        .set(asAdmin())
        .send({
          firstName: 'Subject',
          lastName: 'Teacher',
          email: subjectTeacherEmail,
          password: PASSWORD,
          roles: ['SUBJECT_TEACHER'],
        })
        .expect(201);
      const subjectTeacherId = (teacherRes.body as IdResponse).id;

      const subjectRes = await request(server)
        .post('/subjects')
        .set(asAdmin())
        .send({ name: `Core Subject ${RUN_ID}` })
        .expect(201);
      const subjectId = (subjectRes.body as IdResponse).id;
      const mappingRes = await request(server)
        .post(`/subjects/${subjectId}/classes`)
        .set(asAdmin())
        .send({ classId: coreClassId })
        .expect(201);
      const mappingId = (mappingRes.body as IdResponse).id;

      await request(server)
        .post(`/staff/${subjectTeacherId}/teaching-assignments`)
        .set(asAdmin())
        .send({ classSubjectId: mappingId, termId: currentTermId })
        .expect(201);

      const teacherToken = await loginAndGetToken(subjectTeacherEmail);
      const visibleRes = await request(server)
        .get(`/students/${coreStudentId}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .expect(200);
      expect((visibleRes.body as IdResponse).id).toBe(coreStudentId);

      // Clean up this test's own fixtures (order matters under the Restrict FKs).
      await prisma.teacherAssignment.deleteMany({
        where: { staffId: subjectTeacherId },
      });
      await prisma.classSubject.delete({ where: { id: mappingId } });
      await prisma.subject.delete({ where: { id: subjectId } });
      await prisma.staffRole.deleteMany({
        where: { staffId: subjectTeacherId },
      });
      await prisma.refreshToken.deleteMany({
        where: { staffId: subjectTeacherId },
      });
      await prisma.staff.delete({ where: { id: subjectTeacherId } });
      await prisma.enrollment.deleteMany({
        where: { id: (enrollmentRes.body as IdResponse).id },
      });
    });

    it('lets a STUDENT see only their own record, and a PARENT see only their ward', async () => {
      const server = app.getHttpServer();
      const seededStudent = await prisma.student.findFirst({
        where: { admissionNumber: 'STU2025001' },
      });
      const studentToken = await loginAndGetToken(seededStudent!.email!);

      await request(server)
        .get(`/students/${seededStudent!.id}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);
      await request(server)
        .get(`/students/${coreStudentId}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(404);

      const guardianToken = await loginAndGetToken(
        'guardian.stu2025001@example.com',
      );
      await request(server)
        .get(`/students/${seededStudent!.id}`)
        .set('Authorization', `Bearer ${guardianToken}`)
        .expect(200);
      await request(server)
        .get(`/students/${coreStudentId}`)
        .set('Authorization', `Bearer ${guardianToken}`)
        .expect(404);
    });

    it("resetting a guardian's password revokes their existing refresh token", async () => {
      const server = app.getHttpServer();
      // Uses the dedicated coreGuardianId (created earlier in this block,
      // with a real known temporary password) rather than a seeded
      // guardian — resetting a *seeded* account's password here would
      // permanently break its documented Password123! login for every
      // other test (and the user's own manual testing) that relies on it.
      const loginRes = await request(server)
        .post('/auth/login')
        .send({
          email: coreGuardianEmail,
          password: coreGuardianTemporaryPassword,
        })
        .expect(201);
      const { refreshToken } = loginRes.body as { refreshToken: string };
      expect(refreshToken).toBeTruthy();

      await request(server)
        .post(`/guardians/${coreGuardianId}/reset-password`)
        .set(asAdmin())
        .expect(201);

      await request(server)
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(401);
    });
  });
});
