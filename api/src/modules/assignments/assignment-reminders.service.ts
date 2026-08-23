import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../common/prisma/prisma.service';
import { BroadcastsService } from '../communication/broadcasts.service';

export interface AssignmentReminderRunResult {
  checked: number;
  notified: number;
}

/**
 * docs/05 §6 "auto-notify ... due soon" — same @nestjs/schedule pattern as
 * FeeRemindersService: a daily cron whose body lives in a public method so
 * it can also be triggered manually (and tested) via the controller.
 * `dueSoonNotifiedAt` on the assignment is the stored once-only fact, so a
 * re-run or catch-up after downtime never double-notifies.
 */
@Injectable()
export class AssignmentRemindersService {
  private readonly logger = new Logger(AssignmentRemindersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly broadcasts: BroadcastsService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_7AM)
  async handleCron(): Promise<void> {
    const result = await this.runDueSoonCheck();
    this.logger.log(
      `Assignment due-soon check: ${result.checked} due within 24h, ${result.notified} notified.`,
    );
  }

  async runDueSoonCheck(): Promise<AssignmentReminderRunResult> {
    const now = new Date();
    const cutoff = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const dueSoon = await this.prisma.assignment.findMany({
      where: {
        dueSoonNotifiedAt: null,
        dueDate: { gte: now, lte: cutoff },
      },
      select: { id: true },
    });

    let notified = 0;
    for (const assignment of dueSoon) {
      try {
        await this.broadcasts.sendAssignmentNotice({
          assignmentId: assignment.id,
          kind: 'DUE_SOON',
        });
        await this.prisma.assignment.update({
          where: { id: assignment.id },
          data: { dueSoonNotifiedAt: new Date() },
        });
        notified++;
      } catch (error) {
        this.logger.error(
          `Due-soon notice failed for assignment ${assignment.id}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }

    return { checked: dueSoon.length, notified };
  }
}
