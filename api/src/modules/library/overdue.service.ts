import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import ExcelJS from 'exceljs';
import type { Response } from 'express';
import {
  createSheet,
  sendExcelResponse,
} from '../../common/excel/excel-export.util';
import { PrismaService } from '../../common/prisma/prisma.service';
import { BroadcastsService } from '../communication/broadcasts.service';
import { CirculationService } from './circulation.service';
import { LibrarySettingsService } from './library-settings.service';

export interface OverdueRow {
  loanId: string;
  bookTitle: string;
  borrowerType: 'STUDENT' | 'STAFF';
  borrowerId: string;
  borrowerName: string;
  dueDate: Date;
  daysOverdue: number;
  accruedFine: number;
}

const LOAN_INCLUDE = { book: true } as const;

/**
 * Real-time overdue list + the daily "book overdue" reminder cron
 * (docs/10-dashboard-librarian.md §5) — same @Cron shape as
 * FeeRemindersService.runDaily/CBTAttemptsService.sweepExpiredAttempts:
 * a public run() the @Cron handler delegates to, so it's independently
 * triggerable/testable. Unlike fee reminders' escalating-threshold dedup,
 * this fires every day a loan is still overdue — "daily while overdue"
 * is the intended behavior, not a one-shot per threshold.
 */
@Injectable()
export class LibraryOverdueService {
  private readonly logger = new Logger(LibraryOverdueService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: LibrarySettingsService,
    private readonly circulation: CirculationService,
    private readonly broadcasts: BroadcastsService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_7AM)
  async runDaily(): Promise<void> {
    const rows = await this.getOverdue();
    for (const row of rows) {
      try {
        await this.broadcasts.sendLibraryNotice({
          borrowerType: row.borrowerType,
          borrowerId: row.borrowerId,
          templateKey: 'LIBRARY_OVERDUE',
          context: {
            book_title: row.bookTitle,
            due_date: row.dueDate.toISOString().slice(0, 10),
            days_overdue: String(row.daysOverdue),
            fine_amount: String(row.accruedFine),
          },
          emailSubject: `Overdue — ${row.bookTitle}`,
        });
      } catch (error) {
        this.logger.error(
          `LIBRARY_OVERDUE notice failed for loan ${row.loanId}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }
    this.logger.log(
      `Daily library-overdue run: reminded ${rows.length} borrower(s).`,
    );
  }

  async getOverdue(): Promise<OverdueRow[]> {
    const now = Date.now();
    const policy = await this.settings.loadPolicy();
    const loans = await this.prisma.loan.findMany({
      where: { returnedAt: null, dueDate: { lt: new Date() } },
      include: LOAN_INCLUDE,
      orderBy: { dueDate: 'asc' },
    });

    return Promise.all(
      loans.map(async (loan) => {
        const daysOverdue = Math.max(
          1,
          Math.ceil((now - loan.dueDate.getTime()) / 86_400_000),
        );
        const borrowerName = await this.circulation.getBorrowerName(
          loan.borrowerType,
          loan.borrowerId,
        );
        return {
          loanId: loan.id,
          bookTitle: loan.book.title,
          borrowerType: loan.borrowerType,
          borrowerId: loan.borrowerId,
          borrowerName,
          dueDate: loan.dueDate,
          daysOverdue,
          accruedFine: daysOverdue * policy.finePerDay,
        };
      }),
    );
  }

  async exportOverdue(res: Response): Promise<void> {
    const rows = await this.getOverdue();
    const wb = new ExcelJS.Workbook();
    const sheet = createSheet(wb, 'Overdue', [
      'Borrower',
      'Type',
      'Book',
      'Due Date',
      'Days Overdue',
      'Accrued Fine',
    ]);
    for (const row of rows) {
      sheet.addRow([
        row.borrowerName,
        row.borrowerType,
        row.bookTitle,
        row.dueDate.toISOString().slice(0, 10),
        row.daysOverdue,
        row.accruedFine,
      ]);
    }
    await sendExcelResponse(res, wb, `library-overdue-${Date.now()}.xlsx`);
  }
}
