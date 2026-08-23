import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  Discount,
  Installment,
  Invoice,
  InvoiceLineItem,
  Payment,
  PaymentPlan,
  PaymentTransaction,
} from '@prisma/client';
import { AuditLogService } from '../../common/audit-log/audit-log.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { RequestUser } from '../../common/types/auth.types';
import {
  AddDiscountDto,
  CreateIndividualInvoiceDto,
  GenerateInvoicesDto,
  QueryDefaultersDto,
  QueryInvoicesDto,
} from './dto/invoice.dto';

const PRIVILEGED_ROLES = ['ADMIN', 'VICE_PRINCIPAL', 'BURSAR'];

export type InvoiceWithDetails = Invoice & {
  lineItems: InvoiceLineItem[];
  discounts: Discount[];
  payments: Payment[];
  transactions: PaymentTransaction[];
  paymentPlan: (PaymentPlan & { installments: Installment[] }) | null;
};

// The controller-facing detail shape — InvoiceWithDetails plus the same
// computed discountTotal/netPayable/balance fields the list/defaulters
// summaries expose, so a caller never has to re-derive them from raw
// discounts itself.
export type InvoiceDetail = InvoiceWithDetails & {
  discountTotal: number;
  netPayable: number;
  balance: number;
};

export interface InvoiceSummary {
  id: string;
  studentId: string;
  studentName: string;
  admissionNumber: string;
  termId: string;
  description: string | null;
  subtotal: number;
  discountTotal: number;
  netPayable: number;
  amountPaid: number;
  balance: number;
  status: Invoice['status'];
  dueDate: Date | null;
  createdAt: Date;
}

export interface DefaulterRow extends InvoiceSummary {
  className: string;
  daysOverdue: number | null;
}

@Injectable()
export class InvoicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  // -------------------------------------------------------------------
  // Generation
  // -------------------------------------------------------------------

  /**
   * Bulk-generates one invoice per actively-enrolled student in this
   * class+term from its FeeStructure (docs §3). RECURRING components apply
   * to everyone; ONE_OFF only to a student whose enrollment history shows
   * this is their first term ever at the school (docs §1 "typically only
   * in a student's first term"). CONDITIONAL components (transport,
   * hostel) are never auto-included here — they're billed per-student via
   * createIndividual once a student actually opts in, since there's no
   * opt-in tracking model yet for this stage to read.
   *
   * Idempotent per student: a student who already has an invoice from
   * this exact structure is skipped, so re-running after fixing a
   * mis-mapped class doesn't double-bill anyone already invoiced.
   */
  async generateForClass(
    dto: GenerateInvoicesDto,
    user: RequestUser,
  ): Promise<{ generated: number; skipped: number; totalAmount: number }> {
    const structure = await this.prisma.feeStructure.findUnique({
      where: { classId_termId: { classId: dto.classId, termId: dto.termId } },
      include: { components: true },
    });
    if (!structure) {
      throw new NotFoundException(
        'No fee structure exists for this class and term yet — create one first.',
      );
    }
    if (structure.components.length === 0) {
      throw new BadRequestException(
        'This fee structure has no components yet — add at least one before generating invoices.',
      );
    }

    const enrollments = await this.prisma.enrollment.findMany({
      where: { classId: dto.classId, termId: dto.termId, status: 'ACTIVE' },
    });
    if (enrollments.length === 0) {
      throw new BadRequestException(
        'No actively-enrolled students in this class for this term.',
      );
    }

    const recurring = structure.components.filter(
      (c) => c.type === 'RECURRING',
    );
    const oneOff = structure.components.filter((c) => c.type === 'ONE_OFF');

    let generated = 0;
    let skipped = 0;
    let totalAmount = 0;
    for (const enrollment of enrollments) {
      const existing = await this.prisma.invoice.findUnique({
        where: {
          studentId_termId_feeStructureId: {
            studentId: enrollment.studentId,
            termId: dto.termId,
            feeStructureId: structure.id,
          },
        },
      });
      if (existing) {
        skipped++;
        continue;
      }

      const priorEnrollmentCount = await this.prisma.enrollment.count({
        where: { studentId: enrollment.studentId, id: { not: enrollment.id } },
      });
      const isFirstTerm = priorEnrollmentCount === 0;
      const applicable = isFirstTerm ? [...recurring, ...oneOff] : recurring;
      const subtotal = applicable.reduce((sum, c) => sum + c.amount, 0);
      totalAmount += subtotal;

      // dryRun (docs prompt's "confirmation showing exactly how many
      // students will be invoiced and the total amount before
      // committing") still does every lookup above for an accurate count,
      // it just skips the actual write.
      if (dto.dryRun) {
        generated++;
        continue;
      }

      try {
        await this.prisma.invoice.create({
          data: {
            studentId: enrollment.studentId,
            termId: dto.termId,
            feeStructureId: structure.id,
            subtotal,
            dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
            lineItems: {
              create: applicable.map((c) => ({
                feeComponentId: c.id,
                name: c.name,
                amount: c.amount,
              })),
            },
          },
        });
        generated++;
      } catch (error) {
        // The findUnique check above is check-then-act, not atomic — a
        // concurrent second call for the same class+term (two staff
        // members clicking Generate around the same time, or a
        // double-submitted request) can both pass that check and both
        // reach here. The @@unique constraint still protects the data
        // (only one row ever wins), so this student is just as
        // legitimately "already invoiced" as the findUnique-caught case
        // above — treat it the same way instead of letting a P2002 crash
        // the rest of the batch.
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          totalAmount -= subtotal;
          skipped++;
          continue;
        }
        throw error;
      }
    }

    if (!dto.dryRun && generated > 0) {
      await this.auditLog.write({
        actorId: user.id,
        actorType: 'STAFF',
        actorRole: user.roles.join(','),
        action: 'INVOICES_GENERATED',
        entityType: 'FeeStructure',
        entityId: structure.id,
        afterJson: {
          classId: dto.classId,
          termId: dto.termId,
          generated,
          skipped,
          totalAmount,
        },
      });
    }

    return { generated, skipped, totalAmount };
  }

  /**
   * A standalone, ad-hoc invoice for one student (docs §3 "individual
   * invoices can be adjusted afterward, e.g. adding a one-off levy
   * mid-term") — never folds into an existing invoice, since a parent may
   * have already paid that one in full.
   */
  async createIndividual(
    studentId: string,
    dto: CreateIndividualInvoiceDto,
    user: RequestUser,
  ): Promise<InvoiceDetail> {
    await this.assertStudentExists(studentId);
    const term = await this.prisma.term.findUnique({
      where: { id: dto.termId },
    });
    if (!term) throw new NotFoundException('Term not found');

    const lineItems: {
      feeComponentId: string | null;
      name: string;
      amount: number;
    }[] = [];
    for (const item of dto.items) {
      if (item.feeComponentId) {
        const component = await this.prisma.feeComponent.findUnique({
          where: { id: item.feeComponentId },
        });
        if (!component) {
          throw new BadRequestException(
            `Fee component ${item.feeComponentId} not found`,
          );
        }
        lineItems.push({
          feeComponentId: component.id,
          name: component.name,
          amount: component.amount,
        });
      } else {
        lineItems.push({
          feeComponentId: null,
          name: item.name!,
          amount: item.amount!,
        });
      }
    }
    const subtotal = lineItems.reduce((sum, i) => sum + i.amount, 0);

    const invoice = await this.prisma.invoice.create({
      data: {
        studentId,
        termId: dto.termId,
        description: dto.description,
        subtotal,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        lineItems: { create: lineItems },
      },
      include: {
        lineItems: true,
        discounts: true,
        payments: true,
        transactions: true,
        paymentPlan: { include: { installments: true } },
      },
    });

    await this.auditLog.write({
      actorId: user.id,
      actorType: 'STAFF',
      actorRole: user.roles.join(','),
      action: 'INVOICE_CREATED',
      entityType: 'Invoice',
      entityId: invoice.id,
      afterJson: {
        studentId,
        termId: dto.termId,
        description: dto.description,
        subtotal,
      },
    });

    return this.withComputedFields(invoice);
  }

  // -------------------------------------------------------------------
  // Discounts
  // -------------------------------------------------------------------

  /**
   * docs §2 — recorded distinctly from the invoice total (never just
   * silently lowering subtotal) so reports can show gross given up.
   * `amount` is computed once against the gross subtotal (not against an
   * already-discounted remainder), so stacking a sibling discount with a
   * scholarship doesn't compound them against each other.
   */
  async addDiscount(
    invoiceId: string,
    dto: AddDiscountDto,
    user: RequestUser,
  ): Promise<Discount> {
    const invoice = await this.getInvoiceOrThrow(invoiceId);
    if (invoice.status === 'PAID') {
      throw new BadRequestException(
        'Cannot discount an invoice that has already been paid in full.',
      );
    }

    // Rounded to the nearest kobo — an unrounded percentage (e.g. 33% of
    // 12345.67) would otherwise carry binary-float noise (...0000000001)
    // into a stored NGN amount indefinitely.
    const amount =
      Math.round(
        (dto.type === 'PERCENTAGE'
          ? invoice.subtotal * (dto.value / 100)
          : dto.value) * 100,
      ) / 100;
    const existingDiscountTotal = await this.getDiscountTotal(invoiceId);
    if (existingDiscountTotal + amount > invoice.subtotal) {
      throw new BadRequestException(
        `This discount would bring the total discount to ${(existingDiscountTotal + amount).toFixed(2)}, exceeding the invoice subtotal of ${invoice.subtotal.toFixed(2)}.`,
      );
    }

    const discount = await this.prisma.discount.create({
      data: {
        invoiceId,
        type: dto.type,
        value: dto.value,
        amount,
        reason: dto.reason,
        appliedByStaffId: user.id,
      },
    });

    await this.recomputeStatus(invoiceId);

    await this.auditLog.write({
      actorId: user.id,
      actorType: 'STAFF',
      actorRole: user.roles.join(','),
      action: 'DISCOUNT_APPLIED',
      entityType: 'Invoice',
      entityId: invoiceId,
      afterJson: {
        type: dto.type,
        value: dto.value,
        amount,
        reason: dto.reason,
      },
    });

    return discount;
  }

  // -------------------------------------------------------------------
  // Reads
  // -------------------------------------------------------------------

  async list(
    query: QueryInvoicesDto,
    user: RequestUser,
  ): Promise<InvoiceSummary[]> {
    const where = await this.buildScopedWhere(query, user);
    const invoices = await this.prisma.invoice.findMany({
      where,
      include: { discounts: true, student: true },
      orderBy: { createdAt: 'desc' },
    });
    return invoices
      .map((invoice) => this.toSummary(invoice))
      .filter((summary) => !query.status || summary.status === query.status);
  }

  async getOrThrow(id: string, user: RequestUser): Promise<InvoiceDetail> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        lineItems: true,
        discounts: true,
        payments: true,
        transactions: true,
        paymentPlan: { include: { installments: true } },
      },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    await this.assertInvoiceAccess(invoice, user);
    return this.withComputedFields(invoice);
  }

  /** Internal — no access check, for use by PaymentsService/ReceiptProcessor. */
  async getRawOrThrow(id: string): Promise<InvoiceWithDetails> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        lineItems: true,
        discounts: true,
        payments: true,
        transactions: true,
        paymentPlan: { include: { installments: true } },
      },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  /** docs §6 — real-time outstanding-balance list, sortable/filterable. */
  async getDefaulters(query: QueryDefaultersDto): Promise<DefaulterRow[]> {
    const invoices = await this.prisma.invoice.findMany({
      where: {
        status: { in: ['UNPAID', 'PARTIALLY_PAID'] },
        student: query.classId
          ? {
              enrollments: {
                some: { classId: query.classId, status: 'ACTIVE' },
              },
            }
          : undefined,
      },
      include: {
        discounts: true,
        student: { include: { enrollments: { include: { class: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const now = Date.now();
    const rows: DefaulterRow[] = invoices.map((invoice) => {
      const summary = this.toSummary(invoice);
      const activeEnrollment = invoice.student.enrollments.find(
        (e) => e.termId === invoice.termId,
      );
      // null (not 0) whenever the invoice isn't actually overdue yet —
      // clamping a future due date to 0 would make it indistinguishable
      // from "due today" and would wrongly pass a `minDaysOverdue: 0`
      // filter for a student who isn't late at all.
      const daysOverdue =
        invoice.dueDate && invoice.dueDate.getTime() < now
          ? Math.floor((now - invoice.dueDate.getTime()) / 86_400_000)
          : null;
      return {
        ...summary,
        className: activeEnrollment?.class.name ?? 'Unknown',
        daysOverdue,
      };
    });

    return rows.filter((row) => {
      if (row.balance <= 0) return false;
      if (query.minOwed !== undefined && row.balance < query.minOwed)
        return false;
      if (
        query.minDaysOverdue !== undefined &&
        (row.daysOverdue === null || row.daysOverdue < query.minDaysOverdue)
      ) {
        return false;
      }
      return true;
    });
  }

  // -------------------------------------------------------------------
  // Payment application (used by PaymentsService)
  // -------------------------------------------------------------------

  /**
   * Applies a confirmed payment's amount to the invoice's running balance
   * and recomputes status + any installment schedule — called from within
   * PaymentsService's own transaction (manual entry or webhook-confirmed),
   * never on its own, so the Payment row and this update land atomically.
   */
  async applyPayment(
    invoiceId: string,
    amount: number,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    const invoice = await tx.invoice.findUniqueOrThrow({
      where: { id: invoiceId },
    });
    const newAmountPaid = invoice.amountPaid + amount;
    const discountTotal = await this.getDiscountTotal(invoiceId, tx);
    const netPayable = invoice.subtotal - discountTotal;
    const status = newAmountPaid >= netPayable ? 'PAID' : 'PARTIALLY_PAID';

    await tx.invoice.update({
      where: { id: invoiceId },
      data: { amountPaid: newAmountPaid, status },
    });

    const plan = await tx.paymentPlan.findUnique({
      where: { invoiceId },
      include: { installments: { orderBy: { dueDate: 'asc' } } },
    });
    if (plan) {
      let remaining = newAmountPaid;
      for (const installment of plan.installments) {
        const shouldBePaid = remaining >= installment.amount;
        if (shouldBePaid) remaining -= installment.amount;
        if (shouldBePaid && installment.status !== 'PAID') {
          await tx.installment.update({
            where: { id: installment.id },
            data: { status: 'PAID', paidAt: new Date() },
          });
        } else if (!shouldBePaid && installment.status === 'PAID') {
          // Shouldn't normally happen (payments only ever add up), but
          // keeps the schedule consistent if amounts are ever corrected.
          await tx.installment.update({
            where: { id: installment.id },
            data: { status: 'PENDING', paidAt: null },
          });
        }
      }
    }
  }

  // -------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------

  private withComputedFields(invoice: InvoiceWithDetails): InvoiceDetail {
    const discountTotal = invoice.discounts.reduce(
      (sum, d) => sum + d.amount,
      0,
    );
    const netPayable = invoice.subtotal - discountTotal;
    return {
      ...invoice,
      discountTotal,
      netPayable,
      balance: netPayable - invoice.amountPaid,
    };
  }

  private toSummary(
    invoice: Invoice & {
      discounts: Discount[];
      student: { firstName: string; lastName: string; admissionNumber: string };
    },
  ): InvoiceSummary {
    const discountTotal = invoice.discounts.reduce(
      (sum, d) => sum + d.amount,
      0,
    );
    const netPayable = invoice.subtotal - discountTotal;
    return {
      id: invoice.id,
      studentId: invoice.studentId,
      studentName: `${invoice.student.firstName} ${invoice.student.lastName}`,
      admissionNumber: invoice.student.admissionNumber,
      termId: invoice.termId,
      description: invoice.description,
      subtotal: invoice.subtotal,
      discountTotal,
      netPayable,
      amountPaid: invoice.amountPaid,
      balance: netPayable - invoice.amountPaid,
      status: invoice.status,
      dueDate: invoice.dueDate,
      createdAt: invoice.createdAt,
    };
  }

  private async getDiscountTotal(
    invoiceId: string,
    client: Prisma.TransactionClient | PrismaService = this.prisma,
  ): Promise<number> {
    const result = await client.discount.aggregate({
      where: { invoiceId },
      _sum: { amount: true },
    });
    return result._sum.amount ?? 0;
  }

  private async recomputeStatus(invoiceId: string): Promise<void> {
    const invoice = await this.prisma.invoice.findUniqueOrThrow({
      where: { id: invoiceId },
    });
    const discountTotal = await this.getDiscountTotal(invoiceId);
    const netPayable = invoice.subtotal - discountTotal;
    const status =
      invoice.amountPaid >= netPayable && netPayable > 0
        ? 'PAID'
        : invoice.amountPaid > 0
          ? 'PARTIALLY_PAID'
          : 'UNPAID';
    await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: { status },
    });
  }

  private async getInvoiceOrThrow(id: string): Promise<Invoice> {
    const invoice = await this.prisma.invoice.findUnique({ where: { id } });
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  private async assertStudentExists(studentId: string): Promise<void> {
    const exists = await this.prisma.student.findUnique({
      where: { id: studentId },
    });
    if (!exists) throw new NotFoundException('Student not found');
  }

  /** Mirrors TranscriptService/ResultsService's self-or-guardian-or-privileged pattern. */
  async assertInvoiceAccess(
    invoice: Invoice,
    user: RequestUser,
  ): Promise<void> {
    if (user.roles.includes('STUDENT')) {
      if (user.id !== invoice.studentId) {
        throw new ForbiddenException('You can only view your own invoices');
      }
      return;
    }
    if (user.roles.includes('PARENT')) {
      const link = await this.prisma.studentGuardian.findFirst({
        where: { studentId: invoice.studentId, guardianId: user.id },
      });
      if (!link) {
        throw new ForbiddenException(
          "You can only view your own ward's invoices",
        );
      }
      return;
    }
    if (!user.roles.some((role) => PRIVILEGED_ROLES.includes(role))) {
      throw new ForbiddenException('You do not have access to this invoice');
    }
  }

  private async buildScopedWhere(
    query: QueryInvoicesDto,
    user: RequestUser,
  ): Promise<Prisma.InvoiceWhereInput> {
    if (user.roles.includes('STUDENT')) {
      return { studentId: user.id, termId: query.termId };
    }
    if (user.roles.includes('PARENT')) {
      const links = await this.prisma.studentGuardian.findMany({
        where: { guardianId: user.id },
      });
      const wardIds = links.map((l) => l.studentId);
      if (query.studentId && !wardIds.includes(query.studentId)) {
        throw new ForbiddenException(
          "You can only view your own ward's invoices",
        );
      }
      return {
        studentId: query.studentId ?? { in: wardIds },
        termId: query.termId,
      };
    }
    if (!user.roles.some((role) => PRIVILEGED_ROLES.includes(role))) {
      throw new ForbiddenException('You do not have access to invoices');
    }
    return {
      studentId: query.studentId,
      termId: query.termId,
      student: query.classId
        ? {
            enrollments: { some: { classId: query.classId, status: 'ACTIVE' } },
          }
        : undefined,
    };
  }
}
