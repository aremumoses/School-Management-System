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

interface DocumentResponse {
  id: string;
  studentId: string;
  type: string;
  status: string;
  url: string | null;
  approvedByStaffId: string | null;
  approvedAt: string | null;
}

describe('Documents (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  let adminToken: string;
  let bursarToken: string;

  let studentId: string;
  let studentToken: string;
  let guardianId: string;
  let guardianToken: string;
  let otherStudentId: string;
  let otherStudentToken: string;

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
    bursarToken = await loginAndGetToken('bursar@demoschool.ng');

    const bcrypt = await import('bcrypt');

    const studentRes = await request(server)
      .post('/students')
      .set(asAdmin())
      .send({
        firstName: 'Doc',
        lastName: `Student${RUN_ID}`,
        dateOfBirth: '2009-05-01',
        gender: 'FEMALE',
      })
      .expect(201);
    studentId = (studentRes.body as IdResponse).id;
    const studentEmail = `docstudent.${RUN_ID}@students.demoschool.ng`;
    await prisma.student.update({
      where: { id: studentId },
      data: {
        email: studentEmail,
        passwordHash: await bcrypt.hash(PASSWORD, 10),
      },
    });
    studentToken = await loginAndGetToken(studentEmail);

    const guardianLink = await request(server)
      .post(`/students/${studentId}/guardians`)
      .set(asAdmin())
      .send({
        firstName: 'DocGuardian',
        lastName: `Disc${RUN_ID}`,
        email: `docguardian.${RUN_ID}@example.com`,
        phone: '+2348044440001',
        relationship: 'Mother',
      })
      .expect(201);
    guardianId = (guardianLink.body as { guardianId: string }).guardianId;
    await prisma.guardian.update({
      where: { id: guardianId },
      data: { passwordHash: await bcrypt.hash(PASSWORD, 10) },
    });
    guardianToken = await loginAndGetToken(`docguardian.${RUN_ID}@example.com`);

    // A second, unrelated student — used to prove a student/guardian can't
    // see someone else's document.
    const otherRes = await request(server)
      .post('/students')
      .set(asAdmin())
      .send({
        firstName: 'Doc',
        lastName: `Other${RUN_ID}`,
        dateOfBirth: '2009-05-01',
        gender: 'MALE',
      })
      .expect(201);
    otherStudentId = (otherRes.body as IdResponse).id;
    const otherEmail = `docother.${RUN_ID}@students.demoschool.ng`;
    await prisma.student.update({
      where: { id: otherStudentId },
      data: {
        email: otherEmail,
        passwordHash: await bcrypt.hash(PASSWORD, 10),
      },
    });
    otherStudentToken = await loginAndGetToken(otherEmail);
  });

  afterAll(async () => {
    await prisma.generatedDocument
      .deleteMany({
        where: {
          studentId: { in: [studentId, otherStudentId].filter(Boolean) },
        },
      })
      .catch(() => undefined);

    if (guardianId) {
      await prisma.studentGuardian
        .deleteMany({ where: { guardianId } })
        .catch(() => undefined);
      await prisma.refreshToken
        .deleteMany({ where: { guardianId } })
        .catch(() => undefined);
      await prisma.guardian
        .delete({ where: { id: guardianId } })
        .catch(() => undefined);
    }
    for (const id of [studentId, otherStudentId].filter(Boolean)) {
      await prisma.refreshToken
        .deleteMany({ where: { studentId: id } })
        .catch(() => undefined);
      await prisma.student.delete({ where: { id } }).catch(() => undefined);
    }

    await app.close();
  }, 30_000);

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

  describe('Generate + approve workflow — the "Done when" criterion', () => {
    let documentId: string;

    it('rejects non-Admin/VP from requesting a document', async () => {
      await request(app.getHttpServer())
        .post('/documents/generate')
        .set(as(bursarToken))
        .send({ studentId, type: 'TESTIMONIAL' })
        .expect(403);
    });

    it('Admin requests a testimonial — starts as DRAFT with no download url', async () => {
      const res = await request(app.getHttpServer())
        .post('/documents/generate')
        .set(asAdmin())
        .send({ studentId, type: 'TESTIMONIAL' })
        .expect(201);
      const doc = res.body as DocumentResponse;
      documentId = doc.id;
      expect(doc.status).toBe('DRAFT');
      expect(doc.url).toBeNull();
    });

    it('a DRAFT document is invisible to the student and their guardian — not even the status, per the "never see DRAFT" rule', async () => {
      await request(app.getHttpServer())
        .get(`/documents/${documentId}`)
        .set(as(studentToken))
        .expect(403);

      await request(app.getHttpServer())
        .get(`/documents/${documentId}`)
        .set(as(guardianToken))
        .expect(403);

      const studentList = await request(app.getHttpServer())
        .get('/documents')
        .set(as(studentToken))
        .expect(200);
      expect(
        (studentList.body as DocumentResponse[]).map((d) => d.id),
      ).not.toContain(documentId);

      const guardianList = await request(app.getHttpServer())
        .get('/documents')
        .set(as(guardianToken))
        .expect(200);
      expect(
        (guardianList.body as DocumentResponse[]).map((d) => d.id),
      ).not.toContain(documentId);
    });

    it('rejects an unrelated student/guardian from viewing this document at all', async () => {
      await request(app.getHttpServer())
        .get(`/documents/${documentId}`)
        .set(as(otherStudentToken))
        .expect(403);
    });

    it('rejects every other staff role from viewing or approving — Documents/certificates is Admin/VP only', async () => {
      await request(app.getHttpServer())
        .get(`/documents/${documentId}`)
        .set(as(bursarToken))
        .expect(403);
      await request(app.getHttpServer())
        .post(`/documents/${documentId}/approve`)
        .set(as(bursarToken))
        .expect(403);
    });

    it('approving records the Admin + timestamp, and the PDF eventually becomes downloadable', async () => {
      const approveRes = await request(app.getHttpServer())
        .post(`/documents/${documentId}/approve`)
        .set(asAdmin())
        .expect(201);
      const approved = approveRes.body as DocumentResponse;
      expect(approved.status).toBe('APPROVED');
      expect(approved.approvedByStaffId).toBeTruthy();
      expect(approved.approvedAt).toBeTruthy();
      // Not generated synchronously inside the approve() call — the PDF
      // is rendered asynchronously via the documents queue (see
      // DocumentsService's "url stays null until approval" schema
      // comment), so `url` is still null on this immediate response.
      expect(approved.url).toBeNull();

      let url: string | null = null;
      for (let attempt = 0; attempt < 60 && !url; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const document = await prisma.generatedDocument.findUniqueOrThrow({
          where: { id: documentId },
        });
        url = document.url;
      }
      expect(url).toMatch(/^http/);

      // Now downloadable by the student/guardian — "not downloadable...
      // until an Admin has explicitly approved it" is satisfied the
      // moment both status=APPROVED and the PDF has actually landed.
      const asStudent = await request(app.getHttpServer())
        .get(`/documents/${documentId}`)
        .set(as(studentToken))
        .expect(200);
      expect((asStudent.body as DocumentResponse).url).toMatch(/^http/);
    }, 90_000);

    it('rejects approving an already-approved document a second time', async () => {
      await request(app.getHttpServer())
        .post(`/documents/${documentId}/approve`)
        .set(asAdmin())
        .expect(409);
    });
  });

  describe('Listing', () => {
    it("scopes a guardian's list to their own ward's documents only", async () => {
      const res = await request(app.getHttpServer())
        .get('/documents')
        .set(as(guardianToken))
        .expect(200);
      const documents = res.body as DocumentResponse[];
      expect(documents.every((d) => d.studentId === studentId)).toBe(true);
    });

    it('lets Admin list and filter by studentId', async () => {
      const res = await request(app.getHttpServer())
        .get('/documents')
        .query({ studentId })
        .set(asAdmin())
        .expect(200);
      const documents = res.body as DocumentResponse[];
      expect(documents.length).toBeGreaterThanOrEqual(1);
      expect(documents.every((d) => d.studentId === studentId)).toBe(true);
    });
  });
});
