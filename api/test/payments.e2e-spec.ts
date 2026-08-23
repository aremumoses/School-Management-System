import { createHmac, randomBytes } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';

const PASSWORD = 'Password123!';
const ADMIN_EMAIL = 'admin@demoschool.ng';
const BURSAR_EMAIL = 'bursar@demoschool.ng';
const RUN_ID = Date.now().toString(36);

interface IdResponse {
  id: string;
}

interface InvoiceDetailResponse {
  id: string;
  amountPaid: number;
  status: string;
  balance: number;
  payments: { id: string; amount: number; method: string; reference: string }[];
  paymentPlan: {
    installments: { id: string; amount: number; status: string }[];
  } | null;
}

interface CheckoutResponse {
  reference: string;
  authorizationUrl: string;
  accessCode: string;
}

function signPaystackPayload(
  payload: object,
  secretKey: string,
): { rawBody: Buffer; signature: string } {
  const rawBody = Buffer.from(JSON.stringify(payload), 'utf8');
  const signature = createHmac('sha512', secretKey)
    .update(rawBody)
    .digest('hex');
  return { rawBody, signature };
}

describe('Payments (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let adminToken: string;
  let bursarToken: string;
  let studentToken: string;
  let paystackSecretKey: string;

  let termId: string;
  const studentIds: string[] = [];
  let studentId: string;
  let otherStudentId: string;
  let invoiceA: string; // checkout/webhook
  let invoiceB: string; // manual payment
  let invoiceC: string; // payment plan

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    // rawBody: true — the webhook signature check needs the exact bytes
    // Paystack (or, here, our own correctly-signed simulated payload)
    // signed, not a re-serialized copy of the parsed body.
    app = moduleFixture.createNestApplication({ rawBody: true });
    await app.init();
    prisma = moduleFixture.get(PrismaService);
    // Read after app.init() — ConfigModule's dotenv loading is what
    // populates process.env, so reading this at module-load time (before
    // any Nest app exists) could see it still undefined.
    paystackSecretKey = process.env.PAYSTACK_SECRET_KEY!;
    if (!paystackSecretKey) {
      throw new Error(
        'PAYSTACK_SECRET_KEY is not set — required for this test file',
      );
    }

    const server = app.getHttpServer();
    adminToken = await loginAndGetToken(ADMIN_EMAIL);
    bursarToken = await loginAndGetToken(BURSAR_EMAIL);

    // Same stable anchor results.e2e-spec.ts uses — see its comment for
    // why this avoids racing other spec files' /terms/current flips.
    const seededSession = await prisma.academicSession.findUniqueOrThrow({
      where: { name: '2025/2026' },
    });
    termId = (
      await prisma.term.findUniqueOrThrow({
        where: {
          sessionId_name: { sessionId: seededSession.id, name: 'Third' },
        },
      })
    ).id;

    const studentEmail = `payer.${RUN_ID}@students.demoschool.ng`;
    const studentRes = await request(server)
      .post('/students')
      .set(asAdmin())
      .send({
        firstName: 'Payer',
        lastName: `Pay${RUN_ID}`,
        dateOfBirth: '2010-01-01',
        gender: 'MALE',
      })
      .expect(201);
    studentId = (studentRes.body as IdResponse).id;
    studentIds.push(studentId);
    await prisma.student.update({
      where: { id: studentId },
      data: {
        email: studentEmail,
        passwordHash: await bcrypt.hash(PASSWORD, 10),
      },
    });
    studentToken = await loginAndGetToken(studentEmail);

    const otherRes = await request(server)
      .post('/students')
      .set(asAdmin())
      .send({
        firstName: 'Other',
        lastName: `Pay${RUN_ID}`,
        dateOfBirth: '2010-01-01',
        gender: 'FEMALE',
      })
      .expect(201);
    otherStudentId = (otherRes.body as IdResponse).id;
    studentIds.push(otherStudentId);

    invoiceA = await createInvoice(
      studentId,
      20000,
      'Checkout/webhook test invoice',
    );
    invoiceB = await createInvoice(
      studentId,
      15000,
      'Manual payment test invoice',
    );
    invoiceC = await createInvoice(
      studentId,
      12000,
      'Payment plan test invoice',
    );
  });

  afterAll(async () => {
    await prisma.installment
      .deleteMany({
        where: {
          paymentPlan: { invoiceId: { in: [invoiceA, invoiceB, invoiceC] } },
        },
      })
      .catch(() => undefined);
    await prisma.paymentPlan
      .deleteMany({
        where: { invoiceId: { in: [invoiceA, invoiceB, invoiceC] } },
      })
      .catch(() => undefined);
    await prisma.payment
      .deleteMany({
        where: { invoiceId: { in: [invoiceA, invoiceB, invoiceC] } },
      })
      .catch(() => undefined);
    await prisma.paymentTransaction
      .deleteMany({
        where: { invoiceId: { in: [invoiceA, invoiceB, invoiceC] } },
      })
      .catch(() => undefined);
    await prisma.invoiceLineItem
      .deleteMany({
        where: { invoiceId: { in: [invoiceA, invoiceB, invoiceC] } },
      })
      .catch(() => undefined);
    await prisma.invoice
      .deleteMany({
        where: { id: { in: [invoiceA, invoiceB, invoiceC] } },
      })
      .catch(() => undefined);
    await prisma.refreshToken
      .deleteMany({ where: { studentId: { in: studentIds } } })
      .catch(() => undefined);
    await prisma.student
      .deleteMany({ where: { id: { in: studentIds } } })
      .catch(() => undefined);
    await app.close();
  });

  async function createInvoice(
    forStudentId: string,
    amount: number,
    description: string,
  ): Promise<string> {
    const res = await request(app.getHttpServer())
      .post(`/invoices/${forStudentId}`)
      .set(as(bursarToken))
      .send({ termId, description, items: [{ name: description, amount }] })
      .expect(201);
    return (res.body as IdResponse).id;
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
  async function getInvoice(
    id: string,
    token: string,
  ): Promise<InvoiceDetailResponse> {
    const res = await request(app.getHttpServer())
      .get(`/invoices/${id}`)
      .set(as(token))
      .expect(200);
    return res.body as InvoiceDetailResponse;
  }

  let capturedReference: string;

  describe('POST /payments/checkout', () => {
    it('rejects checking out for more than the outstanding balance', async () => {
      await request(app.getHttpServer())
        .post('/payments/checkout')
        .set(as(bursarToken))
        .send({ invoiceId: invoiceA, amount: 25000 })
        .expect(400);
    });

    it('rejects a student trying to pay for an invoice that is not theirs', async () => {
      const otherInvoice = await createInvoice(
        otherStudentId,
        5000,
        'Other student invoice',
      );
      await request(app.getHttpServer())
        .post('/payments/checkout')
        .set(as(studentToken))
        .send({ invoiceId: otherInvoice })
        .expect(403);
      await prisma.invoiceLineItem.deleteMany({
        where: { invoiceId: otherInvoice },
      });
      await prisma.invoice.delete({ where: { id: otherInvoice } });
    });

    it('rejects a non-Bursar/Student/Parent caller (Admin is view-only)', async () => {
      await request(app.getHttpServer())
        .post('/payments/checkout')
        .set(asAdmin())
        .send({ invoiceId: invoiceA })
        .expect(403);
    });

    it('makes a real Paystack test-mode checkout call and gets back a usable reference + hosted URL', async () => {
      const res = await request(app.getHttpServer())
        .post('/payments/checkout')
        .set(as(bursarToken))
        .send({ invoiceId: invoiceA })
        .expect(201);
      const body = res.body as CheckoutResponse;
      expect(body.reference).toMatch(/^PSK-/);
      expect(body.authorizationUrl).toMatch(
        /^https:\/\/checkout\.paystack\.com\//,
      );
      expect(body.accessCode).toBeTruthy();
      capturedReference = body.reference;

      const transaction = await prisma.paymentTransaction.findUniqueOrThrow({
        where: { reference: body.reference },
      });
      expect(transaction.status).toBe('PENDING');
      expect(transaction.amount).toBe(20000);
    });

    it('rejects checking out an already-fully-paid invoice', async () => {
      // invoiceA isn't paid yet at this point — this is re-asserted again
      // after the webhook confirms it, later in the webhook describe block.
      const detail = await getInvoice(invoiceA, bursarToken);
      expect(detail.status).not.toBe('PAID');
    });
  });

  describe('POST /webhooks/paystack — signature verification', () => {
    it('rejects a tampered signature with no database changes', async () => {
      const payload = {
        event: 'charge.success',
        data: {
          reference: capturedReference,
          amount: 2_000_000,
          status: 'success',
        },
      };
      const { rawBody } = signPaystackPayload(payload, paystackSecretKey);
      const wrongSignature = randomBytes(64).toString('hex');

      await request(app.getHttpServer())
        .post('/webhooks/paystack')
        .set('Content-Type', 'application/json')
        .set('x-paystack-signature', wrongSignature)
        .send(rawBody.toString('utf8'))
        .expect(400);

      const transaction = await prisma.paymentTransaction.findUniqueOrThrow({
        where: { reference: capturedReference },
      });
      expect(transaction.status).toBe('PENDING');
      const paymentCount = await prisma.payment.count({
        where: { invoiceId: invoiceA },
      });
      expect(paymentCount).toBe(0);
    });

    it('rejects a missing signature header', async () => {
      const payload = {
        event: 'charge.success',
        data: {
          reference: capturedReference,
          amount: 2_000_000,
          status: 'success',
        },
      };
      const { rawBody } = signPaystackPayload(payload, paystackSecretKey);
      await request(app.getHttpServer())
        .post('/webhooks/paystack')
        .set('Content-Type', 'application/json')
        .send(rawBody.toString('utf8'))
        .expect(400);
    });

    it('silently acknowledges a correctly-signed event for an unknown reference', async () => {
      const payload = {
        event: 'charge.success',
        data: {
          reference: `PSK-unknown-${RUN_ID}`,
          amount: 1000,
          status: 'success',
        },
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
    });

    it('confirms the payment on a correctly-signed charge.success, then is a no-op on a replayed delivery', async () => {
      const payload = {
        event: 'charge.success',
        data: {
          reference: capturedReference,
          amount: 2_000_000,
          status: 'success',
        },
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

      const detail = await getInvoice(invoiceA, bursarToken);
      expect(detail.status).toBe('PAID');
      expect(detail.amountPaid).toBe(20000);
      expect(detail.payments).toHaveLength(1);
      expect(detail.payments[0].method).toBe('PAYSTACK');

      const auditEntry = await prisma.auditLog.findFirst({
        where: {
          action: 'PAYMENT_CONFIRMED_PAYSTACK',
          entityId: detail.payments[0].id,
        },
      });
      expect(auditEntry).toBeTruthy();
      expect(auditEntry!.actorType).toBe('SYSTEM');

      // Replay the identical delivery — Paystack retries until it gets a
      // 2xx, so this must not double-credit the invoice.
      await request(app.getHttpServer())
        .post('/webhooks/paystack')
        .set('Content-Type', 'application/json')
        .set('x-paystack-signature', signature)
        .send(rawBody.toString('utf8'))
        .expect(200);

      const afterReplay = await getInvoice(invoiceA, bursarToken);
      expect(afterReplay.amountPaid).toBe(20000);
      expect(afterReplay.payments).toHaveLength(1);
    });

    it('rejects checking out on the now-fully-paid invoice', async () => {
      await request(app.getHttpServer())
        .post('/payments/checkout')
        .set(as(bursarToken))
        .send({ invoiceId: invoiceA })
        .expect(400);
    });

    it('marks a checkout FAILED on a correctly-signed charge.failed, instead of leaving it stuck PENDING forever', async () => {
      const checkoutRes = await request(app.getHttpServer())
        .post('/payments/checkout')
        .set(as(bursarToken))
        .send({ invoiceId: invoiceB })
        .expect(201);
      const failedReference = (checkoutRes.body as CheckoutResponse).reference;

      const payload = {
        event: 'charge.failed',
        data: {
          reference: failedReference,
          amount: 1_500_000,
          status: 'failed',
        },
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

      const transaction = await prisma.paymentTransaction.findUniqueOrThrow({
        where: { reference: failedReference },
      });
      expect(transaction.status).toBe('FAILED');

      const detail = await getInvoice(invoiceB, bursarToken);
      expect(detail.payments).toHaveLength(0);
      expect(detail.amountPaid).toBe(0);

      const auditEntry = await prisma.auditLog.findFirst({
        where: { action: 'PAYMENT_FAILED_PAYSTACK', entityId: transaction.id },
      });
      expect(auditEntry).toBeTruthy();
      expect(auditEntry!.actorType).toBe('SYSTEM');
    });

    it('eventually generates a receipt PDF for the confirmed payment', async () => {
      const detail = await getInvoice(invoiceA, bursarToken);
      const paymentId = detail.payments[0].id;

      let receiptUrl: string | null = null;
      for (let attempt = 0; attempt < 60 && !receiptUrl; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const payment = await prisma.payment.findUniqueOrThrow({
          where: { id: paymentId },
        });
        receiptUrl = payment.receiptUrl;
      }
      expect(receiptUrl).toMatch(/^http/);
    }, 90000);
  });

  // Stage 11 hardening — WebhooksController's ThrottlerGuard config skips
  // enforcement when NODE_ENV==='test' (see the skipIf comment in
  // payments.module.ts) so the rest of this file's webhook calls aren't at
  // risk of tripping it. This test deliberately flips NODE_ENV back to
  // exercise the real, production-shaped limit, then always restores it.
  describe('Rate limiting (Stage 11 hardening)', () => {
    afterEach(() => {
      process.env.NODE_ENV = 'test';
    });

    it('throttles POST /webhooks/paystack after 30 requests/min (429 on the 31st)', async () => {
      process.env.NODE_ENV = 'production';

      for (let i = 0; i < 30; i++) {
        const res = await request(app.getHttpServer())
          .post('/webhooks/paystack')
          .set('Content-Type', 'application/json')
          .send('{}');
        expect(res.status).toBe(400);
      }

      await request(app.getHttpServer())
        .post('/webhooks/paystack')
        .set('Content-Type', 'application/json')
        .send('{}')
        .expect(429);
    });
  });

  describe('POST /payments/manual', () => {
    it('rejects a non-Bursar caller', async () => {
      await request(app.getHttpServer())
        .post('/payments/manual')
        .set(asAdmin())
        .send({
          invoiceId: invoiceB,
          amount: 1000,
          method: 'CASH',
          reference: 'X',
        })
        .expect(403);
    });

    it('records two partial cash/transfer payments that accumulate to fully paid', async () => {
      await request(app.getHttpServer())
        .post('/payments/manual')
        .set(as(bursarToken))
        .send({
          invoiceId: invoiceB,
          amount: 6000,
          method: 'CASH',
          reference: `CASH-${RUN_ID}-1`,
        })
        .expect(201);

      let detail = await getInvoice(invoiceB, bursarToken);
      expect(detail.status).toBe('PARTIALLY_PAID');
      expect(detail.balance).toBe(9000);

      await request(app.getHttpServer())
        .post('/payments/manual')
        .set(as(bursarToken))
        .send({
          invoiceId: invoiceB,
          amount: 9000,
          method: 'BANK_TRANSFER',
          reference: `TRF-${RUN_ID}-1`,
        })
        .expect(201);

      detail = await getInvoice(invoiceB, bursarToken);
      expect(detail.status).toBe('PAID');
      expect(detail.balance).toBe(0);
      expect(detail.payments).toHaveLength(2);
    });

    it('eventually generates a receipt PDF for a manually-recorded payment', async () => {
      const detail = await getInvoice(invoiceB, bursarToken);
      const paymentId = detail.payments[0].id;

      let receiptUrl: string | null = null;
      for (let attempt = 0; attempt < 60 && !receiptUrl; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const payment = await prisma.payment.findUniqueOrThrow({
          where: { id: paymentId },
        });
        receiptUrl = payment.receiptUrl;
      }
      expect(receiptUrl).toMatch(/^http/);
    }, 90000);

    it('lets a Bursar re-queue a receipt manually, rejects everyone else, and 404s on an unknown payment', async () => {
      const detail = await getInvoice(invoiceB, bursarToken);
      const paymentId = detail.payments[0].id;

      await request(app.getHttpServer())
        .post(`/payments/${paymentId}/regenerate-receipt`)
        .set(asAdmin())
        .expect(403);

      const res = await request(app.getHttpServer())
        .post(`/payments/${paymentId}/regenerate-receipt`)
        .set(as(bursarToken))
        .expect(201);
      expect(res.body).toEqual({ queued: true });

      await request(app.getHttpServer())
        .post(`/payments/nonexistent-${RUN_ID}/regenerate-receipt`)
        .set(as(bursarToken))
        .expect(404);
    });
  });

  describe('Payment plans', () => {
    it('rejects installments that do not sum to the current outstanding balance', async () => {
      await request(app.getHttpServer())
        .post(`/invoices/${invoiceC}/payment-plan`)
        .set(as(bursarToken))
        .send({
          installments: [
            { dueDate: '2030-01-01T00:00:00.000Z', amount: 5000 },
            { dueDate: '2030-02-01T00:00:00.000Z', amount: 5000 },
          ],
        })
        .expect(400);
    });

    it('creates a plan, then marks installments paid in order as manual payments land', async () => {
      const created = await request(app.getHttpServer())
        .post(`/invoices/${invoiceC}/payment-plan`)
        .set(as(bursarToken))
        .send({
          installments: [
            { dueDate: '2020-01-01T00:00:00.000Z', amount: 5000 },
            { dueDate: '2030-01-01T00:00:00.000Z', amount: 7000 },
          ],
        })
        .expect(201);
      const createdPlan = created.body as {
        id: string;
        installments: unknown[];
      };
      expect(createdPlan.installments).toHaveLength(2);

      const planAuditEntry = await prisma.auditLog.findFirst({
        where: { action: 'PAYMENT_PLAN_CREATED', entityId: createdPlan.id },
      });
      expect(planAuditEntry).toBeTruthy();

      await request(app.getHttpServer())
        .post(`/invoices/${invoiceC}/payment-plan`)
        .set(as(bursarToken))
        .send({
          installments: [
            { dueDate: '2030-01-01T00:00:00.000Z', amount: 12000 },
          ],
        })
        .expect(400); // already has a plan

      await request(app.getHttpServer())
        .post('/payments/manual')
        .set(as(bursarToken))
        .send({
          invoiceId: invoiceC,
          amount: 5000,
          method: 'CASH',
          reference: `CASH-${RUN_ID}-2`,
        })
        .expect(201);

      const afterFirst = await getInvoice(invoiceC, bursarToken);
      const sortedInstallments = afterFirst.paymentPlan!.installments.sort(
        (a, b) => a.amount - b.amount,
      );
      expect(sortedInstallments[0].status).toBe('PAID'); // the 5000 one
      expect(sortedInstallments[1].status).toBe('PENDING'); // the 7000 one

      await request(app.getHttpServer())
        .post('/payments/manual')
        .set(as(bursarToken))
        .send({
          invoiceId: invoiceC,
          amount: 7000,
          method: 'POS',
          reference: `POS-${RUN_ID}-1`,
        })
        .expect(201);

      const afterSecond = await getInvoice(invoiceC, bursarToken);
      expect(afterSecond.status).toBe('PAID');
      expect(
        afterSecond.paymentPlan!.installments.every((i) => i.status === 'PAID'),
      ).toBe(true);
    });

    it('lets the paying student view the installment schedule', async () => {
      await request(app.getHttpServer())
        .get(`/invoices/${invoiceC}/payment-plan`)
        .set(as(studentToken))
        .expect(200);
    });
  });

  describe('GET /reports/finance/collection-summary — payment-method breakdown', () => {
    it('aggregates every recorded payment this term by method', async () => {
      const res = await request(app.getHttpServer())
        .get('/reports/finance/collection-summary')
        .query({ termId })
        .set(as(bursarToken))
        .expect(200);
      const byMethod = (
        res.body as { byMethod: { method: string; amount: number }[] }
      ).byMethod;

      // >= rather than === — the shared seeded term may carry other
      // payments from whichever tests ran earlier in this same run.
      const paystackTotal =
        byMethod.find((m) => m.method === 'PAYSTACK')?.amount ?? 0;
      expect(paystackTotal).toBeGreaterThanOrEqual(20000);
      const cashTotal = byMethod.find((m) => m.method === 'CASH')?.amount ?? 0;
      expect(cashTotal).toBeGreaterThanOrEqual(6000 + 5000);
      const transferTotal =
        byMethod.find((m) => m.method === 'BANK_TRANSFER')?.amount ?? 0;
      expect(transferTotal).toBeGreaterThanOrEqual(9000);
      const posTotal = byMethod.find((m) => m.method === 'POS')?.amount ?? 0;
      expect(posTotal).toBeGreaterThanOrEqual(7000);
    });
  });
});
