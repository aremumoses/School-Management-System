import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import type {
  Installment,
  Payment,
  PaymentMethod,
  PaymentPlan,
} from '@prisma/client';
import { AuditLogService } from '../../common/audit-log/audit-log.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { RequestUser } from '../../common/types/auth.types';
import { InvoicesService } from '../fees/invoices.service';
import {
  CheckoutDto,
  CreatePaymentPlanDto,
  ManualPaymentDto,
} from './dto/payment.dto';
import { PaystackService } from './paystack.service';
import { RECEIPTS_QUEUE, ReceiptJobData } from './receipt/receipt.constants';

export interface ReceiptData {
  school: {
    name: string;
    logoUrl: string | null;
    address: string | null;
    motto: string | null;
    registrationNumber: string | null;
    primaryColor: string;
    secondaryColor: string;
  };
  receiptNumber: string;
  student: { firstName: string; lastName: string; admissionNumber: string };
  invoiceDescription: string;
  termName: string;
  sessionName: string;
  paidAt: string;
  amount: number;
  method: string;
  reference: string;
  recordedByName: string | null;
  invoiceSubtotal: number;
  invoiceDiscountTotal: number;
  invoiceNetPayable: number;
  invoiceAmountPaid: number;
  invoiceBalance: number;
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly invoicesService: InvoicesService,
    private readonly paystackService: PaystackService,
    private readonly auditLog: AuditLogService,
    @InjectQueue(RECEIPTS_QUEUE)
    private readonly receiptsQueue: Queue<ReceiptJobData>,
  ) {}

  // -------------------------------------------------------------------
  // Online checkout
  // -------------------------------------------------------------------

  async checkout(
    dto: CheckoutDto,
    user: RequestUser,
  ): Promise<{
    reference: string;
    authorizationUrl: string;
    accessCode: string;
  }> {
    const invoice = await this.invoicesService.getOrThrow(dto.invoiceId, user);
    const balance = this.computeBalance(invoice);
    if (balance <= 0) {
      throw new BadRequestException('This invoice is already fully paid.');
    }
    const amount = dto.amount ?? balance;
    if (amount > balance) {
      throw new BadRequestException(
        `Cannot check out for ${amount.toFixed(2)} — only ${balance.toFixed(2)} is outstanding on this invoice.`,
      );
    }

    const email = await this.resolvePayerEmail(invoice.studentId, user);
    // Our own reference (not Paystack-generated) — sent to Paystack and
    // echoed back in the webhook payload, so we can look the transaction
    // up without depending on Paystack ever calling us back with anything
    // else identifying.
    const reference = `PSK-${randomUUID()}`;

    const result = await this.paystackService.initializeTransaction({
      email,
      amountNaira: amount,
      reference,
      metadata: { invoiceId: invoice.id },
    });

    await this.prisma.paymentTransaction.create({
      data: {
        invoiceId: invoice.id,
        reference: result.reference,
        amount,
        authorizationUrl: result.authorizationUrl,
      },
    });

    return {
      reference: result.reference,
      authorizationUrl: result.authorizationUrl,
      // Lets the frontend open Paystack's Inline JS popup via
      // `PaystackPop.resumeTransaction(accessCode)` instead of a full-page
      // redirect to authorizationUrl — the documented way to hand a
      // server-initialized (secret-key) transaction to a client-side
      // popup without ever exposing the secret key, and without letting
      // the client re-specify the amount the way a from-scratch
      // `PaystackPop.setup({amount, ...})` call would.
      accessCode: result.accessCode,
    };
  }

  // -------------------------------------------------------------------
  // Webhook
  // -------------------------------------------------------------------

  /**
   * docs §10 — the signature must be checked before anything else; this
   * method's only caller (WebhooksController) is responsible for passing
   * the raw, unparsed body. Idempotent: a reference already marked
   * SUCCESSFUL is a no-op, since Paystack retries webhook delivery until
   * it gets a 2xx and would otherwise double-credit the invoice.
   */
  async handlePaystackWebhook(
    rawBody: Buffer,
    signatureHeader: string | undefined,
  ): Promise<void> {
    if (!this.paystackService.verifySignature(rawBody, signatureHeader)) {
      throw new BadRequestException('Invalid webhook signature');
    }

    const payload = JSON.parse(rawBody.toString('utf8')) as {
      event: string;
      data: { reference: string; amount: number; status: string };
    };

    // Without this, a declined/abandoned checkout leaves its
    // PaymentTransaction stuck in PENDING forever — indistinguishable from
    // "still waiting on the customer" — with no record that it actually
    // failed. We still never touch the Invoice or create a Payment for
    // these; only a genuine charge.success does that.
    if (payload.event === 'charge.failed') {
      // Stage 12 — handle admissions fee failure the same way
      if (payload.data.reference.startsWith('ADMIT-')) {
        await this.prisma.admissionFeeTransaction.updateMany({
          where: {
            reference: payload.data.reference,
            status: 'PENDING',
          },
          data: { status: 'FAILED' },
        });
        return;
      }
      const failedTransaction = await this.prisma.paymentTransaction.findUnique(
        {
          where: { reference: payload.data.reference },
        },
      );
      if (failedTransaction && failedTransaction.status === 'PENDING') {
        await this.prisma.paymentTransaction.update({
          where: { id: failedTransaction.id },
          data: { status: 'FAILED' },
        });
        await this.auditLog.write({
          actorId: null,
          actorType: 'SYSTEM',
          action: 'PAYMENT_FAILED_PAYSTACK',
          entityType: 'PaymentTransaction',
          entityId: failedTransaction.id,
          afterJson: {
            invoiceId: failedTransaction.invoiceId,
            reference: failedTransaction.reference,
          },
        });
      }
      return;
    }

    if (payload.event !== 'charge.success') {
      return;
    }

    // Stage 12 — Admissions fee payments use an ADMIT- reference prefix and
    // live in AdmissionFeeTransaction rather than PaymentTransaction+Invoice.
    // Handled here directly (not delegated to AdmissionsService) to avoid a
    // circular module dependency (AdmissionsModule already imports PaymentsModule).
    if (payload.data.reference.startsWith('ADMIT-')) {
      const admissionTx = await this.prisma.admissionFeeTransaction.findUnique({
        where: { reference: payload.data.reference },
      });
      if (admissionTx && admissionTx.status === 'PENDING') {
        await this.prisma.$transaction([
          this.prisma.admissionFeeTransaction.update({
            where: { reference: payload.data.reference },
            data: { status: 'SUCCESS' },
          }),
          this.prisma.applicant.update({
            where: { id: admissionTx.applicantId },
            data: { applicationFeePaid: true },
          }),
        ]);
        await this.auditLog.write({
          actorId: null,
          actorType: 'SYSTEM',
          action: 'ADMISSION_FEE_PAID',
          entityType: 'Applicant',
          entityId: admissionTx.applicantId,
          afterJson: {
            reference: admissionTx.reference,
            amount: admissionTx.amount,
          },
        });
      }
      return;
    }

    const transaction = await this.prisma.paymentTransaction.findUnique({
      where: { reference: payload.data.reference },
    });
    if (!transaction) {
      this.logger.warn(
        `Received a charge.success webhook for unknown reference ${payload.data.reference}`,
      );
      return;
    }
    if (transaction.status === 'SUCCESSFUL') {
      return;
    }

    const payment = await this.prisma.$transaction(async (tx) => {
      await tx.paymentTransaction.update({
        where: { id: transaction.id },
        data: { status: 'SUCCESSFUL' },
      });
      const created = await tx.payment.create({
        data: {
          invoiceId: transaction.invoiceId,
          amount: transaction.amount,
          method: 'PAYSTACK',
          reference: transaction.reference,
          transactionId: transaction.id,
        },
      });
      await this.invoicesService.applyPayment(
        transaction.invoiceId,
        transaction.amount,
        tx,
      );
      return created;
    });

    await this.auditLog.write({
      actorId: null,
      actorType: 'SYSTEM',
      action: 'PAYMENT_CONFIRMED_PAYSTACK',
      entityType: 'Payment',
      entityId: payment.id,
      afterJson: {
        invoiceId: transaction.invoiceId,
        amount: transaction.amount,
        reference: transaction.reference,
      },
    });

    await this.receiptsQueue.add('generate', { paymentId: payment.id });
  }

  // -------------------------------------------------------------------
  // Manual payment
  // -------------------------------------------------------------------

  /** docs §4 — Bursar-recorded cash/transfer/POS payment, same downstream effects as a webhook-confirmed one. */
  async recordManualPayment(
    dto: ManualPaymentDto,
    user: RequestUser,
  ): Promise<Payment> {
    const invoice = await this.invoicesService.getRawOrThrow(dto.invoiceId);

    const payment = await this.prisma.$transaction(async (tx) => {
      const created = await tx.payment.create({
        data: {
          invoiceId: invoice.id,
          amount: dto.amount,
          method: dto.method,
          reference: dto.reference,
          recordedByStaffId: user.id,
        },
      });
      await this.invoicesService.applyPayment(invoice.id, dto.amount, tx);
      return created;
    });

    await this.auditLog.write({
      actorId: user.id,
      actorType: 'STAFF',
      actorRole: user.roles.join(','),
      action: 'PAYMENT_RECORDED_MANUAL',
      entityType: 'Payment',
      entityId: payment.id,
      afterJson: {
        invoiceId: invoice.id,
        amount: dto.amount,
        method: dto.method,
        reference: dto.reference,
      },
    });

    await this.receiptsQueue.add('generate', { paymentId: payment.id });

    return payment;
  }

  // -------------------------------------------------------------------
  // Payment plans
  // -------------------------------------------------------------------

  async createPaymentPlan(
    invoiceId: string,
    dto: CreatePaymentPlanDto,
    user: RequestUser,
  ): Promise<PaymentPlan> {
    const invoice = await this.invoicesService.getRawOrThrow(invoiceId);
    const existingPlan = await this.prisma.paymentPlan.findUnique({
      where: { invoiceId },
    });
    if (existingPlan) {
      throw new BadRequestException('This invoice already has a payment plan.');
    }

    const balance = this.computeBalance(invoice);
    const installmentTotal = dto.installments.reduce(
      (sum, i) => sum + i.amount,
      0,
    );
    if (Math.abs(installmentTotal - balance) > 0.01) {
      throw new BadRequestException(
        `Installments must sum to the current outstanding balance of ${balance.toFixed(2)} (got ${installmentTotal.toFixed(2)}).`,
      );
    }

    const plan = await this.prisma.paymentPlan.create({
      data: {
        invoiceId,
        createdByStaffId: user.id,
        installments: {
          create: dto.installments.map((i) => ({
            dueDate: new Date(i.dueDate),
            amount: i.amount,
          })),
        },
      },
      include: { installments: true },
    });

    await this.auditLog.write({
      actorId: user.id,
      actorType: 'STAFF',
      actorRole: user.roles.join(','),
      action: 'PAYMENT_PLAN_CREATED',
      entityType: 'PaymentPlan',
      entityId: plan.id,
      afterJson: { invoiceId, installments: dto.installments },
    });

    return plan;
  }

  async getPaymentPlan(
    invoiceId: string,
    user: RequestUser,
  ): Promise<(PaymentPlan & { installments: Installment[] }) | null> {
    const invoice = await this.invoicesService.getOrThrow(invoiceId, user);
    return invoice.paymentPlan;
  }

  /**
   * The Bursar's receipts screen — every recorded payment, newest first,
   * with the student's name joined in and the receipt URL (null while the
   * async PDF job is still rendering; the frontend polls for it).
   */
  async listPayments(opts: { termId?: string; method?: PaymentMethod }) {
    const payments = await this.prisma.payment.findMany({
      where: {
        ...(opts.termId ? { invoice: { termId: opts.termId } } : {}),
        ...(opts.method ? { method: opts.method } : {}),
      },
      orderBy: { paidAt: 'desc' },
      include: {
        invoice: {
          select: {
            id: true,
            termId: true,
            description: true,
            student: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                admissionNumber: true,
              },
            },
          },
        },
        recordedBy: { select: { firstName: true, lastName: true } },
      },
    });

    return payments.map((p) => ({
      id: p.id,
      amount: p.amount,
      method: p.method,
      reference: p.reference,
      invoiceId: p.invoiceId,
      studentId: p.invoice.student.id,
      studentName: `${p.invoice.student.firstName} ${p.invoice.student.lastName}`,
      admissionNumber: p.invoice.student.admissionNumber,
      invoiceDescription: p.invoice.description,
      recordedByName: p.recordedBy
        ? `${p.recordedBy.firstName} ${p.recordedBy.lastName}`
        : null,
      receiptUrl: p.receiptUrl,
      receiptGeneratedAt: p.receiptGeneratedAt,
      paidAt: p.paidAt,
    }));
  }

  /**
   * Recovery path for the rare case a receipt's BullMQ job exhausts every
   * retry (ReceiptProcessor logs an error when that happens, but logging
   * alone gives a Bursar no way to actually fix it without this). Safe to
   * call on a payment that already has a receiptUrl — the job just
   * overwrites it with a freshly-rendered one.
   */
  async regenerateReceipt(paymentId: string): Promise<{ queued: true }> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    await this.receiptsQueue.add('generate', { paymentId });
    return { queued: true };
  }

  // -------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------

  private computeBalance(invoice: {
    subtotal: number;
    amountPaid: number;
    discounts: { amount: number }[];
  }): number {
    const discountTotal = invoice.discounts.reduce(
      (sum, d) => sum + d.amount,
      0,
    );
    return invoice.subtotal - discountTotal - invoice.amountPaid;
  }

  private async resolvePayerEmail(
    studentId: string,
    user: RequestUser,
  ): Promise<string> {
    if (user.userType === 'STUDENT') {
      const student = await this.prisma.student.findUniqueOrThrow({
        where: { id: user.id },
      });
      if (!student.email) {
        throw new BadRequestException(
          'Add an email address to your profile before paying online.',
        );
      }
      return student.email;
    }
    if (user.userType === 'GUARDIAN') {
      const guardian = await this.prisma.guardian.findUniqueOrThrow({
        where: { id: user.id },
      });
      return guardian.email;
    }
    // Staff (Bursar) checking out on a student's behalf.
    const student = await this.prisma.student.findUniqueOrThrow({
      where: { id: studentId },
    });
    if (student.email) return student.email;
    const link = await this.prisma.studentGuardian.findFirst({
      where: { studentId },
    });
    if (link) {
      const guardian = await this.prisma.guardian.findUniqueOrThrow({
        where: { id: link.guardianId },
      });
      return guardian.email;
    }
    throw new BadRequestException(
      'This student has no email on file and no linked guardian with one — add one before checking out online.',
    );
  }

  /** Called by ReceiptProcessor — gathers everything the receipt template needs for one confirmed payment. */
  async buildReceiptData(paymentId: string): Promise<ReceiptData> {
    const payment = await this.prisma.payment.findUniqueOrThrow({
      where: { id: paymentId },
      include: {
        recordedBy: true,
        invoice: {
          include: {
            student: true,
            term: { include: { session: true } },
            discounts: true,
          },
        },
      },
    });
    const school = await this.prisma.school.findFirstOrThrow();
    const invoice = payment.invoice;
    const discountTotal = invoice.discounts.reduce(
      (sum, d) => sum + d.amount,
      0,
    );
    const netPayable = invoice.subtotal - discountTotal;

    return {
      school: {
        name: school.name,
        logoUrl: school.logoUrl,
        address: school.address,
        motto: school.motto,
        registrationNumber: school.registrationNumber,
        primaryColor: school.documentPrimaryColor ?? '#1D4ED8',
        secondaryColor: school.documentSecondaryColor ?? '#F59E0B',
      },
      receiptNumber: payment.id,
      student: {
        firstName: invoice.student.firstName,
        lastName: invoice.student.lastName,
        admissionNumber: invoice.student.admissionNumber,
      },
      invoiceDescription:
        invoice.description ?? `${invoice.term.name} Term Fees`,
      termName: invoice.term.name,
      sessionName: invoice.term.session.name,
      paidAt: payment.paidAt.toISOString(),
      amount: payment.amount,
      method: payment.method,
      reference: payment.reference,
      recordedByName: payment.recordedBy
        ? `${payment.recordedBy.firstName} ${payment.recordedBy.lastName}`
        : null,
      invoiceSubtotal: invoice.subtotal,
      invoiceDiscountTotal: discountTotal,
      invoiceNetPayable: netPayable,
      invoiceAmountPaid: invoice.amountPaid,
      invoiceBalance: netPayable - invoice.amountPaid,
    };
  }
}
