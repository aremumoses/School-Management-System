import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  FeeReminderThreshold,
  NotificationChannel,
  Prisma,
  RecipientType,
} from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { BroadcastsService } from './broadcasts.service';
import {
  SystemTemplateKey,
  SYSTEM_TEMPLATE_KEYS,
} from './templates/default-templates';

interface ThresholdConfig {
  templateKey: SystemTemplateKey;
  // docs §5: step 1 in-app only, step 2 SMS+in-app, steps 3/4 WhatsApp+SMS.
  // Stage 7 originally substituted EMAIL for WhatsApp here since no BSP was
  // wired up (see git history) — Stage 28 adds a real WhatsApp channel
  // (WhatsAppProviderService), so this restores the spec's actual
  // WhatsApp+SMS combination instead of the EMAIL stand-in.
  channels: NotificationChannel[];
}

const THRESHOLD_CONFIG: Record<FeeReminderThreshold, ThresholdConfig> = {
  T_MINUS_7: {
    templateKey: SYSTEM_TEMPLATE_KEYS.FEE_REMINDER_T7,
    channels: [],
  },
  T_MINUS_3: {
    templateKey: SYSTEM_TEMPLATE_KEYS.FEE_REMINDER_T3,
    channels: [NotificationChannel.SMS],
  },
  DUE_DATE: {
    templateKey: SYSTEM_TEMPLATE_KEYS.FEE_REMINDER_DUE,
    channels: [NotificationChannel.WHATSAPP, NotificationChannel.SMS],
  },
  T_PLUS_3: {
    templateKey: SYSTEM_TEMPLATE_KEYS.FEE_REMINDER_OVERDUE,
    channels: [NotificationChannel.WHATSAPP, NotificationChannel.SMS],
  },
};

export interface FeeReminderRunResult {
  checked: number;
  fired: number;
  details: { invoiceId: string; threshold: FeeReminderThreshold }[];
}

/**
 * docs/16-module-communication.md §5 / docs/19-unique-differentiators.md
 * §6 — the escalating fee-reminder sequence. `run()` is exposed (not just
 * the `@Cron` handler) so it can be triggered manually via
 * FeeRemindersController, both for ops ("send today's batch right now")
 * and so the "Done when" criterion ("a manually-triggered run... correctly
 * identifies and messages only the invoices that just crossed a
 * threshold") is actually exercisable.
 */
@Injectable()
export class FeeRemindersService {
  private readonly logger = new Logger(FeeRemindersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly broadcastsService: BroadcastsService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_7AM)
  async runDaily(): Promise<void> {
    const result = await this.run();
    this.logger.log(
      `Daily fee-reminder run: checked ${result.checked} invoices, fired ${result.fired} reminders.`,
    );
  }

  async run(options: { dryRun?: boolean } = {}): Promise<FeeReminderRunResult> {
    const invoices = await this.prisma.invoice.findMany({
      where: {
        status: { in: ['UNPAID', 'PARTIALLY_PAID'] },
        dueDate: { not: null },
      },
      include: { discounts: true, reminderLogs: true, student: true },
    });

    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);

    const fired: { invoiceId: string; threshold: FeeReminderThreshold }[] = [];

    for (const invoice of invoices) {
      const dueMidnight = new Date(invoice.dueDate!);
      dueMidnight.setHours(0, 0, 0, 0);
      const daysUntilDue = Math.round(
        (dueMidnight.getTime() - todayMidnight.getTime()) / 86_400_000,
      );

      const alreadyFired = new Set(
        invoice.reminderLogs.map((log) => log.threshold),
      );
      const eligible = this.eligibleThresholds(daysUntilDue).filter(
        (threshold) => !alreadyFired.has(threshold),
      );

      for (const threshold of eligible) {
        fired.push({ invoiceId: invoice.id, threshold });
        if (!options.dryRun) {
          await this.fireThreshold(invoice, threshold);
        }
      }
    }

    return { checked: invoices.length, fired: fired.length, details: fired };
  }

  /**
   * `<=` (not `===`) at every step — a daily cron that catches up after
   * downtime, or a manual re-run, should still fire a threshold it missed
   * rather than silently skip it forever. The FeeReminderLog uniqueness
   * constraint (checked again, atomically, in fireThreshold) is what
   * actually prevents firing the *same* threshold twice, not this list.
   */
  private eligibleThresholds(daysUntilDue: number): FeeReminderThreshold[] {
    const thresholds: FeeReminderThreshold[] = [];
    if (daysUntilDue <= 7) thresholds.push(FeeReminderThreshold.T_MINUS_7);
    if (daysUntilDue <= 3) thresholds.push(FeeReminderThreshold.T_MINUS_3);
    if (daysUntilDue <= 0) thresholds.push(FeeReminderThreshold.DUE_DATE);
    if (daysUntilDue <= -3) thresholds.push(FeeReminderThreshold.T_PLUS_3);
    return thresholds;
  }

  private async fireThreshold(
    invoice: Prisma.InvoiceGetPayload<{
      include: { discounts: true; student: true };
    }>,
    threshold: FeeReminderThreshold,
  ): Promise<void> {
    try {
      await this.prisma.feeReminderLog.create({
        data: { invoiceId: invoice.id, threshold },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        // Another concurrent run (or a retry) already fired this exact
        // threshold for this invoice — the whole point of the unique
        // constraint is to make this a silent no-op, not an error.
        return;
      }
      throw error;
    }

    const { templateKey, channels } = THRESHOLD_CONFIG[threshold];
    const template = await this.prisma.messageTemplate.findUnique({
      where: { key: templateKey },
    });
    if (!template) {
      this.logger.error(
        `Missing system template ${templateKey} — FeeReminderLog recorded but no message could be sent for invoice ${invoice.id}.`,
      );
      return;
    }

    const guardianLinks = await this.prisma.studentGuardian.findMany({
      where: { studentId: invoice.studentId },
      include: { guardian: true },
    });
    if (guardianLinks.length === 0) {
      this.logger.warn(
        `Invoice ${invoice.id} crossed ${threshold} but the student has no guardian on file — nothing to send.`,
      );
      return;
    }

    const discountTotal = invoice.discounts.reduce(
      (sum, d) => sum + d.amount,
      0,
    );
    const balance = invoice.subtotal - discountTotal - invoice.amountPaid;
    const context = {
      student_name: `${invoice.student.firstName} ${invoice.student.lastName}`,
      balance: formatNaira(balance),
      due_date: invoice.dueDate!.toISOString().slice(0, 10),
    };

    const recipients = guardianLinks.map((link) => ({
      recipientType: RecipientType.GUARDIAN,
      recipientId: link.guardian.id,
      name: `${link.guardian.firstName} ${link.guardian.lastName}`,
      phone: link.guardian.phone,
      email: link.guardian.email,
      context,
    }));

    const broadcastLog = await this.broadcastsService.createSystemBroadcastLog({
      targetRecipientType: RecipientType.STUDENT,
      targetId: invoice.studentId,
      channels,
      templateId: template.id,
      message: template.body,
      recipientCount: recipients.length,
    });

    await this.broadcastsService.fanOut({
      broadcastLogId: broadcastLog.id,
      recipients,
      channels,
      bodyTemplate: template.body,
      emailSubject: `Fee reminder — ${context.student_name}`,
    });
  }
}

function formatNaira(amount: number): string {
  return `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
