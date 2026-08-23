import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface LibraryAnalytics {
  mostBorrowed: {
    bookId: string;
    title: string;
    category: string;
    loanCount: number;
  }[];
  busiestPeriods: { period: string; loanCount: number }[];
  overdueRate: number;
  totalLoans: number;
  categoryUsage: { category: string; loanCount: number }[];
}

@Injectable()
export class LibraryAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAnalytics(from?: string, to?: string): Promise<LibraryAnalytics> {
    const loans = await this.prisma.loan.findMany({
      where: {
        ...((from || to) && {
          issuedAt: {
            ...(from && { gte: new Date(from) }),
            ...(to && { lte: new Date(to) }),
          },
        }),
      },
      include: { book: true },
    });

    const byBook = new Map<
      string,
      { title: string; category: string; count: number }
    >();
    const byPeriod = new Map<string, number>();
    const byCategory = new Map<string, number>();
    let lateCount = 0;
    const now = Date.now();

    for (const loan of loans) {
      const bookEntry = byBook.get(loan.bookId) ?? {
        title: loan.book.title,
        category: loan.book.category,
        count: 0,
      };
      bookEntry.count += 1;
      byBook.set(loan.bookId, bookEntry);

      const period = loan.issuedAt.toISOString().slice(0, 7); // YYYY-MM
      byPeriod.set(period, (byPeriod.get(period) ?? 0) + 1);

      byCategory.set(
        loan.book.category,
        (byCategory.get(loan.book.category) ?? 0) + 1,
      );

      const isLate = loan.returnedAt
        ? loan.returnedAt.getTime() > loan.dueDate.getTime()
        : loan.dueDate.getTime() < now;
      if (isLate) lateCount += 1;
    }

    const mostBorrowed = [...byBook.entries()]
      .map(([bookId, v]) => ({
        bookId,
        title: v.title,
        category: v.category,
        loanCount: v.count,
      }))
      .sort((a, b) => b.loanCount - a.loanCount)
      .slice(0, 10);

    const busiestPeriods = [...byPeriod.entries()]
      .map(([period, loanCount]) => ({ period, loanCount }))
      .sort((a, b) => a.period.localeCompare(b.period));

    const categoryUsage = [...byCategory.entries()]
      .map(([category, loanCount]) => ({ category, loanCount }))
      .sort((a, b) => b.loanCount - a.loanCount);

    return {
      mostBorrowed,
      busiestPeriods,
      overdueRate: loans.length > 0 ? (lateCount / loans.length) * 100 : 0,
      totalLoans: loans.length,
      categoryUsage,
    };
  }
}
