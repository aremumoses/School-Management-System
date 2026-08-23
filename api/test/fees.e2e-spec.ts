import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';

const PASSWORD = 'Password123!';
const ADMIN_EMAIL = 'admin@demoschool.ng';
const BURSAR_EMAIL = 'bursar@demoschool.ng';
const EXAM_OFFICER_EMAIL = 'examofficer@demoschool.ng';
const RUN_ID = Date.now().toString(36);

interface IdResponse {
  id: string;
}

interface SessionResponse {
  id: string;
  terms: { id: string; name: string }[];
}

interface FeeComponentResponse {
  id: string;
  name: string;
  amount: number;
  type: string;
}

interface FeeStructureResponse {
  id: string;
  components: FeeComponentResponse[];
}

interface InvoiceSummaryResponse {
  id: string;
  studentId: string;
  subtotal: number;
  discountTotal: number;
  netPayable: number;
  amountPaid: number;
  balance: number;
  status: string;
  dueDate: string | null;
}

interface InvoiceDetailResponse extends InvoiceSummaryResponse {
  lineItems: { name: string; amount: number; feeComponentId: string | null }[];
  discounts: { type: string; value: number; amount: number; reason: string }[];
}

interface GenerateResponse {
  generated: number;
  skipped: number;
  totalAmount: number;
}

interface DefaulterResponse extends InvoiceSummaryResponse {
  className: string;
  daysOverdue: number | null;
}

interface CollectionSummaryResponse {
  totalExpected: number;
  totalCollected: number;
  totalOutstanding: number;
  byClass: {
    classId: string;
    className: string;
    expected: number;
    collected: number;
  }[];
  byComponent: { name: string; expected: number; collected: number }[];
  byMethod: { method: string; amount: number }[];
}

interface OutstandingReportResponse {
  totalOutstanding: number;
  byClass: {
    classId: string;
    className: string;
    outstanding: number;
    invoiceCount: number;
  }[];
  byTerm: { termId: string; outstanding: number; invoiceCount: number }[];
}

describe('Fees & Invoicing (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let adminToken: string;
  let bursarToken: string;
  let examOfficerToken: string;

  let sessionId: string;
  let term1Id: string;
  let term2Id: string;
  let classId: string;
  let armId: string;

  const studentIds: string[] = [];
  let returningStudentId: string;
  let newStudentId: string;
  let inactiveStudentId: string;
  let structureId: string;
  let componentsByName: Record<string, FeeComponentResponse>;

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
    bursarToken = await loginAndGetToken(BURSAR_EMAIL);
    examOfficerToken = await loginAndGetToken(EXAM_OFFICER_EMAIL);

    // Term1 (earlier) establishes "returningStudent" as not-first-term;
    // Term2 (later) is what we actually generate invoices for.
    const sessionRes = await request(server)
      .post('/academic-sessions')
      .set(asAdmin())
      .send({
        name: `Fees-${RUN_ID}`,
        terms: [
          { name: 'Term1', startDate: '2098-09-01', endDate: '2098-12-01' },
          { name: 'Term2', startDate: '2099-01-01', endDate: '2099-04-01' },
        ],
      })
      .expect(201);
    const session = sessionRes.body as SessionResponse;
    sessionId = session.id;
    term1Id = session.terms.find((t) => t.name === 'Term1')!.id;
    term2Id = session.terms.find((t) => t.name === 'Term2')!.id;

    classId = (
      (
        await request(server)
          .post('/classes')
          .set(asAdmin())
          .send({ name: `FeesClass-${RUN_ID}`, level: 70 })
          .expect(201)
      ).body as IdResponse
    ).id;
    armId = (
      (
        await request(server)
          .post(`/classes/${classId}/arms`)
          .set(asAdmin())
          .send({ name: 'A' })
          .expect(201)
      ).body as IdResponse
    ).id;

    for (const label of ['Returning', 'New', 'Inactive']) {
      const student = await request(server)
        .post('/students')
        .set(asAdmin())
        .send({
          firstName: label,
          lastName: `Fees${RUN_ID}`,
          dateOfBirth: '2011-01-01',
          gender: 'FEMALE',
        })
        .expect(201);
      const id = (student.body as IdResponse).id;
      studentIds.push(id);
      if (label === 'Returning') returningStudentId = id;
      if (label === 'New') newStudentId = id;
      if (label === 'Inactive') inactiveStudentId = id;
    }

    // Returning student has a Term1 enrollment too, so generateForClass
    // sees them as NOT first-term (no ONE_OFF component). Closed out as
    // PROMOTED before the Term2 enrollment below — a student can only
    // have one ACTIVE enrollment at a time (the same invariant Stage 3's
    // StudentsService and Stage 5's PromotionService both enforce).
    const term1Enrollment = await request(server)
      .post(`/students/${returningStudentId}/enrollments`)
      .set(asAdmin())
      .send({ classId, armId, termId: term1Id })
      .expect(201);
    await request(server)
      .patch(
        `/students/${returningStudentId}/enrollments/${(term1Enrollment.body as IdResponse).id}`,
      )
      .set(asAdmin())
      .send({ status: 'PROMOTED' })
      .expect(200);

    for (const studentId of [
      returningStudentId,
      newStudentId,
      inactiveStudentId,
    ]) {
      await request(server)
        .post(`/students/${studentId}/enrollments`)
        .set(asAdmin())
        .send({ classId, armId, termId: term2Id })
        .expect(201);
    }
    // Mark the "Inactive" student's Term2 enrollment WITHDRAWN — bulk
    // generation must skip them entirely.
    const inactiveEnrollments = await prisma.enrollment.findMany({
      where: { studentId: inactiveStudentId, termId: term2Id },
    });
    await request(server)
      .patch(
        `/students/${inactiveStudentId}/enrollments/${inactiveEnrollments[0].id}`,
      )
      .set(asAdmin())
      .send({ status: 'WITHDRAWN' })
      .expect(200);

    const structureRes = await request(server)
      .post('/fee-structures')
      .set(as(bursarToken))
      .send({
        classId,
        termId: term2Id,
        components: [
          { name: 'Tuition', amount: 50000, type: 'RECURRING' },
          { name: 'PTA Levy', amount: 5000, type: 'RECURRING' },
          { name: 'Admission Fee', amount: 10000, type: 'ONE_OFF' },
          { name: 'Transport', amount: 8000, type: 'CONDITIONAL' },
        ],
      })
      .expect(201);
    const structure = structureRes.body as FeeStructureResponse;
    structureId = structure.id;
    componentsByName = Object.fromEntries(
      structure.components.map((c) => [c.name, c]),
    );
  });

  afterAll(async () => {
    await prisma.discount
      .deleteMany({ where: { invoice: { studentId: { in: studentIds } } } })
      .catch(() => undefined);
    await prisma.invoiceLineItem
      .deleteMany({ where: { invoice: { studentId: { in: studentIds } } } })
      .catch(() => undefined);
    await prisma.invoice
      .deleteMany({ where: { studentId: { in: studentIds } } })
      .catch(() => undefined);
    // Guarded — structureId undefined (an earlier beforeAll step never
    // reached its assignment) would make the feeComponent delete's
    // `where` collapse to `{}` and wipe every FeeComponent school-wide,
    // including the real seeded JSS1/JSS2/SSS1 structures. Same reasoning
    // on sessionId below.
    if (structureId) {
      await prisma.feeComponent
        .deleteMany({ where: { feeStructureId: structureId } })
        .catch(() => undefined);
      await prisma.feeStructure
        .delete({ where: { id: structureId } })
        .catch(() => undefined);
    }
    await prisma.enrollment
      .deleteMany({ where: { studentId: { in: studentIds } } })
      .catch(() => undefined);
    await prisma.student
      .deleteMany({ where: { id: { in: studentIds } } })
      .catch(() => undefined);
    await prisma.arm.delete({ where: { id: armId } }).catch(() => undefined);
    await prisma.class
      .delete({ where: { id: classId } })
      .catch(() => undefined);
    if (sessionId) {
      await prisma.term
        .deleteMany({ where: { sessionId } })
        .catch(() => undefined);
    }
    await prisma.academicSession
      .delete({ where: { id: sessionId } })
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

  describe('FeeStructure + FeeComponent CRUD', () => {
    it('rejects a duplicate structure for the same class+term', async () => {
      await request(app.getHttpServer())
        .post('/fee-structures')
        .set(as(bursarToken))
        .send({
          classId,
          termId: term2Id,
          components: [{ name: 'X', amount: 1, type: 'RECURRING' }],
        })
        .expect(409);
    });

    it('rejects a non-Bursar caller (Admin is view-only for fees)', async () => {
      await request(app.getHttpServer())
        .post('/fee-structures')
        .set(asAdmin())
        .send({
          classId,
          termId: term1Id,
          components: [{ name: 'X', amount: 1, type: 'RECURRING' }],
        })
        .expect(403);
    });

    it('adds, edits, and deletes a component', async () => {
      const added = await request(app.getHttpServer())
        .post(`/fee-structures/${structureId}/components`)
        .set(as(bursarToken))
        .send({ name: `Extra-${RUN_ID}`, amount: 500, type: 'ONE_OFF' })
        .expect(201);
      const componentId = (added.body as IdResponse).id;

      await request(app.getHttpServer())
        .patch(`/fee-structures/components/${componentId}`)
        .set(as(bursarToken))
        .send({ amount: 750 })
        .expect(200);

      await request(app.getHttpServer())
        .delete(`/fee-structures/components/${componentId}`)
        .set(as(bursarToken))
        .expect(204);
    });
  });

  describe('POST /invoices/generate', () => {
    it('dryRun previews the exact count/total without creating anything', async () => {
      const res = await request(app.getHttpServer())
        .post('/invoices/generate')
        .set(as(bursarToken))
        .send({ classId, termId: term2Id, dryRun: true })
        .expect(201);
      expect(res.body as GenerateResponse).toEqual({
        generated: 2,
        skipped: 0,
        totalAmount: 65000 + 55000,
      });

      const invoiceCount = await prisma.invoice.count({
        where: { termId: term2Id, feeStructureId: structureId },
      });
      expect(invoiceCount).toBe(0);
    });

    it('bills the new student RECURRING+ONE_OFF, the returning student RECURRING only, and skips the withdrawn one', async () => {
      const res = await request(app.getHttpServer())
        .post('/invoices/generate')
        .set(as(bursarToken))
        .send({ classId, termId: term2Id, dueDate: '2020-01-01T00:00:00.000Z' })
        .expect(201);
      expect(res.body as GenerateResponse).toEqual({
        generated: 2,
        skipped: 0,
        totalAmount: 65000 + 55000,
      });

      const newInvoice = await prisma.invoice.findFirstOrThrow({
        where: { studentId: newStudentId, termId: term2Id },
      });
      expect(newInvoice.subtotal).toBe(50000 + 5000 + 10000);

      const returningInvoice = await prisma.invoice.findFirstOrThrow({
        where: { studentId: returningStudentId, termId: term2Id },
      });
      expect(returningInvoice.subtotal).toBe(50000 + 5000);

      const inactiveInvoice = await prisma.invoice.findFirst({
        where: { studentId: inactiveStudentId, termId: term2Id },
      });
      expect(inactiveInvoice).toBeNull();
    });

    it('is idempotent — re-running skips students already invoiced from this structure', async () => {
      const res = await request(app.getHttpServer())
        .post('/invoices/generate')
        .set(as(bursarToken))
        .send({ classId, termId: term2Id })
        .expect(201);
      expect(res.body as GenerateResponse).toEqual({
        generated: 0,
        skipped: 2,
        totalAmount: 0,
      });
    });
  });

  describe('POST /invoices/:studentId (individual one-off invoice)', () => {
    it('creates a standalone invoice, separate from the bulk one, mixing a free-form item and a referenced FeeComponent', async () => {
      const res = await request(app.getHttpServer())
        .post(`/invoices/${newStudentId}`)
        .set(as(bursarToken))
        .send({
          termId: term2Id,
          description: 'Mid-term Sports Levy',
          items: [
            { name: 'Sports Levy', amount: 3000 },
            { feeComponentId: componentsByName.Transport.id },
          ],
        })
        .expect(201);
      const invoice = res.body as InvoiceDetailResponse;
      expect(invoice.subtotal).toBe(3000 + 8000);
      expect(
        invoice.lineItems.find((i) => i.name === 'Transport')?.amount,
      ).toBe(8000);

      const allInvoicesForNewStudent = await prisma.invoice.count({
        where: { studentId: newStudentId, termId: term2Id },
      });
      expect(allInvoicesForNewStudent).toBe(2);
    });
  });

  describe('POST /invoices/:id/discounts', () => {
    let invoiceId: string;

    beforeAll(async () => {
      const invoice = await prisma.invoice.findFirstOrThrow({
        where: {
          studentId: returningStudentId,
          termId: term2Id,
          feeStructureId: structureId,
        },
      });
      invoiceId = invoice.id;
    });

    it('applies a percentage discount computed against the gross subtotal', async () => {
      const res = await request(app.getHttpServer())
        .post(`/invoices/${invoiceId}/discounts`)
        .set(as(bursarToken))
        .send({ type: 'PERCENTAGE', value: 10, reason: 'Sibling discount' })
        .expect(201);
      expect(res.body as { amount: number }).toMatchObject({ amount: 5500 }); // 10% of 55000

      const detail = await request(app.getHttpServer())
        .get(`/invoices/${invoiceId}`)
        .set(as(bursarToken))
        .expect(200);
      const body = detail.body as InvoiceDetailResponse;
      expect(body.discountTotal).toBe(5500);
      expect(body.netPayable).toBe(55000 - 5500);
    });

    it('rejects a further discount that would exceed the subtotal', async () => {
      await request(app.getHttpServer())
        .post(`/invoices/${invoiceId}/discounts`)
        .set(as(bursarToken))
        .send({ type: 'FLAT', value: 60000, reason: 'Too generous' })
        .expect(400);
    });

    it('rejects a non-Bursar caller', async () => {
      await request(app.getHttpServer())
        .post(`/invoices/${invoiceId}/discounts`)
        .set(asAdmin())
        .send({ type: 'FLAT', value: 100, reason: 'nope' })
        .expect(403);
    });

    it('rounds a percentage discount to the nearest kobo instead of carrying binary-float noise', async () => {
      const invoice = await request(app.getHttpServer())
        .post(`/invoices/${newStudentId}`)
        .set(as(bursarToken))
        .send({
          termId: term2Id,
          description: `Rounding test ${RUN_ID}`,
          items: [{ name: 'Rounding Levy', amount: 12345.67 }],
        })
        .expect(201);
      const roundingInvoiceId = (invoice.body as IdResponse).id;

      const res = await request(app.getHttpServer())
        .post(`/invoices/${roundingInvoiceId}/discounts`)
        .set(as(bursarToken))
        .send({
          type: 'PERCENTAGE',
          value: 33.333,
          reason: 'Float-noise check',
        })
        .expect(201);
      const amount = (res.body as { amount: number }).amount;
      expect(Number.isInteger(Math.round(amount * 100))).toBe(true);
      expect(amount.toString().split('.')[1]?.length ?? 0).toBeLessThanOrEqual(
        2,
      );
    });
  });

  describe('Access control on invoices', () => {
    it("lets a student view only their own invoices, never another student's", async () => {
      const email = `newstudent.${RUN_ID}@students.demoschool.ng`;
      await prisma.student.update({
        where: { id: newStudentId },
        data: { email, passwordHash: await bcrypt.hash(PASSWORD, 10) },
      });
      const studentToken = await loginAndGetToken(email);

      const ownInvoice = await prisma.invoice.findFirstOrThrow({
        where: {
          studentId: newStudentId,
          termId: term2Id,
          feeStructureId: structureId,
        },
      });
      await request(app.getHttpServer())
        .get(`/invoices/${ownInvoice.id}`)
        .set(as(studentToken))
        .expect(200);

      const otherInvoice = await prisma.invoice.findFirstOrThrow({
        where: {
          studentId: returningStudentId,
          termId: term2Id,
          feeStructureId: structureId,
        },
      });
      await request(app.getHttpServer())
        .get(`/invoices/${otherInvoice.id}`)
        .set(as(studentToken))
        .expect(403);
    });
  });

  describe('GET /invoices/defaulters', () => {
    it('lists unpaid invoices for the class, filterable by minOwed and minDaysOverdue', async () => {
      const all = await request(app.getHttpServer())
        .get('/invoices/defaulters')
        .query({ classId })
        .set(as(bursarToken))
        .expect(200);
      const rows = all.body as DefaulterResponse[];
      const newStudentRow = rows.find(
        (r) => r.studentId === newStudentId && r.balance === 65000,
      );
      expect(newStudentRow).toBeDefined();
      expect(newStudentRow!.daysOverdue).toBeGreaterThan(0); // dueDate was set to 2020

      const highBar = await request(app.getHttpServer())
        .get('/invoices/defaulters')
        .query({ classId, minOwed: 1_000_000 })
        .set(as(bursarToken))
        .expect(200);
      expect((highBar.body as DefaulterResponse[]).length).toBe(0);
    });

    it('reports null (not 0) daysOverdue for a future due date, and excludes it from minDaysOverdue:0', async () => {
      const futureInvoice = await request(app.getHttpServer())
        .post(`/invoices/${returningStudentId}`)
        .set(as(bursarToken))
        .send({
          termId: term2Id,
          description: `Future due date test ${RUN_ID}`,
          dueDate: '2099-01-01T00:00:00.000Z',
          items: [{ name: 'Future Levy', amount: 1000 }],
        })
        .expect(201);
      const futureInvoiceId = (futureInvoice.body as IdResponse).id;

      const res = await request(app.getHttpServer())
        .get('/invoices/defaulters')
        .query({ classId, minDaysOverdue: 0 })
        .set(as(bursarToken))
        .expect(200);
      const rows = res.body as DefaulterResponse[];
      const row = rows.find((r) => r.id === futureInvoiceId);
      // Not in the minDaysOverdue:0 results at all — it isn't overdue yet.
      expect(row).toBeUndefined();

      const unfiltered = await request(app.getHttpServer())
        .get('/invoices/defaulters')
        .query({ classId })
        .set(as(bursarToken))
        .expect(200);
      const unfilteredRow = (unfiltered.body as DefaulterResponse[]).find(
        (r) => r.id === futureInvoiceId,
      );
      expect(unfilteredRow?.daysOverdue).toBeNull();
    });

    it('rejects a non-privileged caller (sanity check on Roles guard wiring)', async () => {
      await request(app.getHttpServer())
        .get('/invoices/defaulters')
        .set(as(examOfficerToken))
        .expect(403);
    });
  });

  describe('GET /reports/finance/collection-summary and /outstanding', () => {
    it('reports expected vs collected for the term, broken down by class and component', async () => {
      const res = await request(app.getHttpServer())
        .get('/reports/finance/collection-summary')
        .query({ termId: term2Id })
        .set(as(bursarToken))
        .expect(200);
      const body = res.body as CollectionSummaryResponse;
      expect(body.totalCollected).toBe(0);
      const classRow = body.byClass.find((c) => c.classId === classId);
      expect(classRow).toBeDefined();
      expect(classRow!.expected).toBeGreaterThan(0);
      const tuitionRow = body.byComponent.find((c) => c.name === 'Tuition');
      expect(tuitionRow?.expected).toBe(100000); // 50000 x 2 students
      // No payments recorded in this fixture — present and empty, not
      // missing, confirming the field is always returned.
      expect(body.byMethod).toEqual([]);
    });

    it('reports the outstanding balance rolled up by class and term', async () => {
      const res = await request(app.getHttpServer())
        .get('/reports/finance/outstanding')
        .set(as(bursarToken))
        .expect(200);
      const body = res.body as OutstandingReportResponse;
      const classRow = body.byClass.find((c) => c.classId === classId);
      expect(classRow).toBeDefined();
      expect(classRow!.invoiceCount).toBeGreaterThanOrEqual(2);
      const termRow = body.byTerm.find((t) => t.termId === term2Id);
      expect(termRow).toBeDefined();
    });

    it('rejects a non-privileged caller (sanity check on Roles guard wiring)', async () => {
      await request(app.getHttpServer())
        .get('/reports/finance/outstanding')
        .set(as(examOfficerToken))
        .expect(403);
    });
  });

  describe('Audit log coverage', () => {
    it('writes an audit entry for fee-structure creation, invoice generation, and individual invoice creation', async () => {
      const structureLog = await prisma.auditLog.findFirst({
        where: { action: 'FEE_STRUCTURE_CREATED', entityId: structureId },
      });
      expect(structureLog).toBeTruthy();
      expect(structureLog!.actorType).toBe('STAFF');

      const generatedLog = await prisma.auditLog.findFirst({
        where: { action: 'INVOICES_GENERATED', entityId: structureId },
      });
      expect(generatedLog).toBeTruthy();

      const newStudentInvoice = await prisma.invoice.findFirstOrThrow({
        where: {
          studentId: newStudentId,
          termId: term2Id,
          feeStructureId: structureId,
        },
      });
      const individualLog = await prisma.auditLog.findFirst({
        where: { action: 'INVOICE_CREATED' },
      });
      expect(individualLog).toBeTruthy();
      // Sanity-check the bulk-generated invoice itself is unaffected by
      // the ad-hoc INVOICE_CREATED logging path (different action name).
      const bulkLog = await prisma.auditLog.findFirst({
        where: { action: 'INVOICE_CREATED', entityId: newStudentInvoice.id },
      });
      expect(bulkLog).toBeNull();
    });
  });
});
