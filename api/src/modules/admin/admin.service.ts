import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface DashboardSummaryDto {
  totalActiveStudents: number;
  totalActiveStaff: number;
  /** Today's school-wide attendance rate (0–100), based on daily (non-per-subject) records */
  todayAttendanceRate: number | null;
  /** Current term's fee collection rate (0–100), or null if no term is current */
  termCollectionRate: number | null;
  /** Number of (class, term) pairs currently in PENDING_APPROVAL stage */
  pendingResultApprovals: number;
  /** Number of SUSPENSION/EXPULSION actions in PROPOSED status awaiting Admin decision */
  pendingSuspensionApprovals: number;
  /** Upcoming events (starting within the next 7 days) */
  upcomingEventsCount: number;
}

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboardSummary(): Promise<DashboardSummaryDto> {
    const today = new Date();
    const todayStart = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    );
    const next7Days = new Date(todayStart.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [
      totalActiveStudents,
      totalActiveStaff,
      pendingResultApprovals,
      pendingSuspensionApprovals,
      upcomingEventsCount,
      currentTerm,
    ] = await Promise.all([
      this.prisma.student.count({ where: { isActive: true } }),
      this.prisma.staff.count({ where: { isActive: true } }),
      // Count distinct (arm, term) pairs in PENDING_APPROVAL workflow stage
      // (stored in ClassTermResultStatus, not StudentTermResult)
      this.prisma.classTermResultStatus.count({
        where: { stage: 'PENDING_APPROVAL' },
      }),
      this.prisma.disciplinaryAction.count({
        where: {
          status: 'PROPOSED',
          actionType: { in: ['SUSPENSION', 'EXPULSION'] },
        },
      }),
      this.prisma.event.count({
        where: {
          startDate: { gte: todayStart, lt: next7Days },
        },
      }),
      this.prisma.term.findFirst({ where: { isCurrent: true } }),
    ]);

    // Today's school-wide attendance rate
    let todayAttendanceRate: number | null = null;
    const todayRecords = await this.prisma.attendance.groupBy({
      by: ['status'],
      where: {
        date: {
          gte: todayStart,
          lt: new Date(todayStart.getTime() + 24 * 60 * 60 * 1000),
        },
        classSubjectId: null, // daily attendance only
      },
      _count: { status: true },
    });
    if (todayRecords.length > 0) {
      const total = todayRecords.reduce((sum, r) => sum + r._count.status, 0);
      const present = todayRecords
        .filter((r) => r.status === 'PRESENT' || r.status === 'LATE')
        .reduce((sum, r) => sum + r._count.status, 0);
      todayAttendanceRate =
        total > 0 ? Math.round((present / total) * 1000) / 10 : null;
    }

    // Fee collection rate for current term
    let termCollectionRate: number | null = null;
    if (currentTerm) {
      const invoices = await this.prisma.invoice.findMany({
        where: { termId: currentTerm.id },
        include: { discounts: true, lineItems: true, payments: true },
      });
      if (invoices.length > 0) {
        let totalExpected = 0;
        let totalCollected = 0;
        for (const inv of invoices) {
          const subtotal = inv.lineItems.reduce((s, li) => s + li.amount, 0);
          const discountTotal = inv.discounts.reduce(
            (s, d) =>
              s +
              (d.type === 'PERCENTAGE' ? (d.value / 100) * subtotal : d.value),
            0,
          );
          const netPayable = Math.max(0, subtotal - discountTotal);
          const paid = inv.payments.reduce((s, p) => s + p.amount, 0);
          totalExpected += netPayable;
          totalCollected += Math.min(paid, netPayable);
        }
        termCollectionRate =
          totalExpected > 0
            ? Math.round((totalCollected / totalExpected) * 1000) / 10
            : 0;
      }
    }

    return {
      totalActiveStudents,
      totalActiveStaff,
      todayAttendanceRate,
      termCollectionRate,
      pendingResultApprovals,
      pendingSuspensionApprovals,
      upcomingEventsCount,
    };
  }
}
