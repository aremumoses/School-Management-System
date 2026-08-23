import { Injectable, NotFoundException } from '@nestjs/common';
import type { ExpenseCategory, PaymentMethod } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface CollectionSummaryResponse {
  termId: string;
  totalExpected: number;
  totalCollected: number;
  totalOutstanding: number;
  byClass: {
    classId: string;
    className: string;
    expected: number;
    collected: number;
    outstanding: number;
  }[];
  byComponent: { name: string; expected: number; collected: number }[];
  // docs/15-module-fees-payments.md §8 "payment-method breakdown" — actual
  // recorded Payment rows for this term, not derived from invoices (a
  // payment can be CASH/BANK_TRANSFER/POS/PAYSTACK regardless of which
  // invoice/components it settles).
  byMethod: { method: PaymentMethod; amount: number }[];
}

export interface FinanceTrendPoint {
  /** termId or sessionId depending on granularity */
  id: string;
  /** "First — 2025/2026" or "2025/2026" */
  label: string;
  expected: number;
  collected: number;
  outstanding: number;
  /** collected / expected as a 0–100 percentage; null when nothing was expected */
  collectionRate: number | null;
}

export interface FinanceTrendsResponse {
  metric: 'collection' | 'outstanding';
  granularity: 'term' | 'session';
  points: FinanceTrendPoint[];
}

export interface ExpensesSummaryResponse {
  totalExpenses: number;
  byCategory: { category: ExpenseCategory; amount: number; count: number }[];
  totalCollected: number;
  /** totalCollected − totalExpenses for the same period */
  netIncome: number;
  from: string | null;
  to: string | null;
}

export interface OutstandingReportResponse {
  totalOutstanding: number;
  byClass: {
    classId: string;
    className: string;
    outstanding: number;
    invoiceCount: number;
  }[];
  byTerm: {
    termId: string;
    termName: string;
    sessionName: string;
    outstanding: number;
    invoiceCount: number;
  }[];
}

@Injectable()
export class FinanceReportsService {
  constructor(private readonly prisma: PrismaService) {}

  /** docs §8 — expected vs collected, by class and by fee component, for one term. */
  async getCollectionSummary(
    termId: string,
  ): Promise<CollectionSummaryResponse> {
    const term = await this.prisma.term.findUnique({ where: { id: termId } });
    if (!term) throw new NotFoundException('Term not found');

    const invoices = await this.prisma.invoice.findMany({
      where: { termId },
      include: {
        discounts: true,
        lineItems: true,
        student: { include: { enrollments: { where: { termId } } } },
      },
    });

    let totalExpected = 0;
    let totalCollected = 0;
    const byClass = new Map<
      string,
      {
        classId: string;
        className: string;
        expected: number;
        collected: number;
      }
    >();
    const byComponent = new Map<
      string,
      { name: string; expected: number; collected: number }
    >();

    for (const invoice of invoices) {
      const discountTotal = invoice.discounts.reduce(
        (sum, d) => sum + d.amount,
        0,
      );
      const expected = invoice.subtotal - discountTotal;
      const collected = invoice.amountPaid;
      totalExpected += expected;
      totalCollected += collected;

      const enrollment = invoice.student.enrollments[0];
      const classKey = enrollment?.classId ?? 'unassigned';
      const classEntry = byClass.get(classKey) ?? {
        classId: classKey,
        className: 'Unassigned',
        expected: 0,
        collected: 0,
      };
      classEntry.expected += expected;
      classEntry.collected += collected;
      byClass.set(classKey, classEntry);

      // Payments apply to the invoice as a whole, not earmarked to a
      // specific line item, so "collected by component" is a proportional
      // allocation (each component's share of this invoice's expected
      // total, applied to what was actually collected) rather than a
      // directly-recorded figure.
      for (const item of invoice.lineItems) {
        const entry = byComponent.get(item.name) ?? {
          name: item.name,
          expected: 0,
          collected: 0,
        };
        entry.expected += item.amount;
        const share = invoice.subtotal > 0 ? item.amount / invoice.subtotal : 0;
        entry.collected += collected * share;
        byComponent.set(item.name, entry);
      }
    }

    const classIds = [...byClass.keys()].filter((k) => k !== 'unassigned');
    const classes = await this.prisma.class.findMany({
      where: { id: { in: classIds } },
    });
    const classNameById = new Map(classes.map((c) => [c.id, c.name]));
    for (const entry of byClass.values()) {
      entry.className = classNameById.get(entry.classId) ?? entry.className;
    }

    const payments = await this.prisma.payment.findMany({
      where: { invoice: { termId } },
      select: { method: true, amount: true },
    });
    const byMethod = new Map<PaymentMethod, number>();
    for (const payment of payments) {
      byMethod.set(
        payment.method,
        (byMethod.get(payment.method) ?? 0) + payment.amount,
      );
    }

    return {
      termId,
      totalExpected,
      totalCollected,
      totalOutstanding: totalExpected - totalCollected,
      byClass: [...byClass.values()].map((c) => ({
        ...c,
        outstanding: c.expected - c.collected,
      })),
      byComponent: [...byComponent.values()],
      byMethod: [...byMethod.entries()].map(([method, amount]) => ({
        method,
        amount,
      })),
    };
  }

  /** docs §8 — the full outstanding-balance report, rolled up by class and by term. */
  async getOutstandingReport(): Promise<OutstandingReportResponse> {
    const invoices = await this.prisma.invoice.findMany({
      where: { status: { in: ['UNPAID', 'PARTIALLY_PAID'] } },
      include: {
        discounts: true,
        term: { include: { session: true } },
        student: { include: { enrollments: true } },
      },
    });

    let totalOutstanding = 0;
    const byClass = new Map<
      string,
      {
        classId: string;
        className: string;
        outstanding: number;
        invoiceCount: number;
      }
    >();
    const byTerm = new Map<
      string,
      {
        termId: string;
        termName: string;
        sessionName: string;
        outstanding: number;
        invoiceCount: number;
      }
    >();

    for (const invoice of invoices) {
      const discountTotal = invoice.discounts.reduce(
        (sum, d) => sum + d.amount,
        0,
      );
      const outstanding = invoice.subtotal - discountTotal - invoice.amountPaid;
      if (outstanding <= 0) continue;
      totalOutstanding += outstanding;

      const enrollment = invoice.student.enrollments.find(
        (e) => e.termId === invoice.termId,
      );
      const classKey = enrollment?.classId ?? 'unassigned';
      const classEntry = byClass.get(classKey) ?? {
        classId: classKey,
        className: 'Unassigned',
        outstanding: 0,
        invoiceCount: 0,
      };
      classEntry.outstanding += outstanding;
      classEntry.invoiceCount += 1;
      byClass.set(classKey, classEntry);

      const termEntry = byTerm.get(invoice.termId) ?? {
        termId: invoice.termId,
        termName: invoice.term.name,
        sessionName: invoice.term.session.name,
        outstanding: 0,
        invoiceCount: 0,
      };
      termEntry.outstanding += outstanding;
      termEntry.invoiceCount += 1;
      byTerm.set(invoice.termId, termEntry);
    }

    const classIds = [...byClass.keys()].filter((k) => k !== 'unassigned');
    const classes = await this.prisma.class.findMany({
      where: { id: { in: classIds } },
    });
    const classNameById = new Map(classes.map((c) => [c.id, c.name]));
    for (const entry of byClass.values()) {
      entry.className = classNameById.get(entry.classId) ?? entry.className;
    }

    return {
      totalOutstanding,
      byClass: [...byClass.values()],
      byTerm: [...byTerm.values()],
    };
  }

  /**
   * docs §8 "term-on-term and session-on-session trend" — the same
   * expected/collected aggregation as getCollectionSummary, but bucketed by
   * term (or rolled up by session) across every term that has invoices,
   * ordered chronologically so the frontend can chart it directly.
   */
  async getTrends(
    metric: 'collection' | 'outstanding',
    granularity: 'term' | 'session',
  ): Promise<FinanceTrendsResponse> {
    const invoices = await this.prisma.invoice.findMany({
      include: {
        discounts: true,
        term: { include: { session: true } },
      },
    });

    interface Bucket {
      id: string;
      label: string;
      sortKey: number;
      expected: number;
      collected: number;
    }
    const buckets = new Map<string, Bucket>();

    for (const invoice of invoices) {
      const discountTotal = invoice.discounts.reduce(
        (sum, d) => sum + d.amount,
        0,
      );
      const expected = Math.max(0, invoice.subtotal - discountTotal);
      const collected = invoice.amountPaid;

      const key =
        granularity === 'session' ? invoice.term.sessionId : invoice.termId;
      const entry = buckets.get(key) ?? {
        id: key,
        label:
          granularity === 'session'
            ? invoice.term.session.name
            : `${invoice.term.name} — ${invoice.term.session.name}`,
        sortKey: invoice.term.startDate.getTime(),
        expected: 0,
        collected: 0,
      };
      entry.expected += expected;
      entry.collected += collected;
      // A session's sort position is its earliest term's start date.
      entry.sortKey = Math.min(entry.sortKey, invoice.term.startDate.getTime());
      buckets.set(key, entry);
    }

    const points: FinanceTrendPoint[] = [...buckets.values()]
      .sort((a, b) => a.sortKey - b.sortKey)
      .map(({ id, label, expected, collected }) => ({
        id,
        label,
        expected,
        collected,
        outstanding: Math.max(0, expected - collected),
        collectionRate:
          expected > 0 ? Math.round((collected / expected) * 1000) / 10 : null,
      }));

    return { metric, granularity, points };
  }

  /** docs §7/§8 — total expenses by category and net income for a period. */
  async getExpensesSummary(
    from?: string,
    to?: string,
  ): Promise<ExpensesSummaryResponse> {
    const dateFilter =
      from || to
        ? {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(to) } : {}),
          }
        : undefined;

    const [expenseGroups, payments] = await Promise.all([
      this.prisma.expense.groupBy({
        by: ['category'],
        where: {
          voidedAt: null,
          ...(dateFilter ? { date: dateFilter } : {}),
        },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      this.prisma.payment.aggregate({
        where: dateFilter ? { paidAt: dateFilter } : {},
        _sum: { amount: true },
      }),
    ]);

    const byCategory = expenseGroups
      .map((g) => ({
        category: g.category,
        amount: g._sum.amount ?? 0,
        count: g._count._all,
      }))
      .sort((a, b) => b.amount - a.amount);
    const totalExpenses = byCategory.reduce((s, c) => s + c.amount, 0);
    const totalCollected = payments._sum.amount ?? 0;

    return {
      totalExpenses,
      byCategory,
      totalCollected,
      netIncome: totalCollected - totalExpenses,
      from: from ?? null,
      to: to ?? null,
    };
  }
}
