import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DocumentExpiryAlertThreshold, Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { BroadcastsService } from '../communication/broadcasts.service';

const THRESHOLD_LABELS: Record<DocumentExpiryAlertThreshold, string> = {
  DUE_IN_30_DAYS: 'due within 30 days',
  DUE_IN_7_DAYS: 'due within 7 days',
  OVERDUE: 'overdue',
};

/**
 * Same "log table + unique constraint absorbs the race, `<=` threshold
 * comparison so a missed day still catches up" shape as Stage 25's
 * VehicleMaintenanceService — mirrored here for "staff document nearing
 * expiry" (typically a fixed-term contract) instead of "vehicle service
 * due soon."
 */
@Injectable()
export class DocumentExpiryAlertService {
  private readonly logger = new Logger(DocumentExpiryAlertService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly broadcasts: BroadcastsService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_7AM)
  async runDaily(): Promise<void> {
    const documents = await this.prisma.staffDocument.findMany({
      where: { expiryDate: { not: null } },
      include: { staff: true },
    });

    const now = Date.now();
    let fired = 0;
    for (const doc of documents) {
      const daysUntilDue = Math.ceil(
        (doc.expiryDate!.getTime() - now) / 86_400_000,
      );
      for (const threshold of this.eligibleThresholds(daysUntilDue)) {
        const didFire = await this.fireThreshold(doc.id, threshold, {
          staffName: `${doc.staff.firstName} ${doc.staff.lastName}`,
          documentType: doc.type,
          expiryDate: doc.expiryDate!.toISOString().slice(0, 10),
        });
        if (didFire) fired += 1;
      }
    }
    this.logger.log(
      `Daily staff-document-expiry run: checked ${documents.length} documents, fired ${fired} alerts.`,
    );
  }

  private eligibleThresholds(
    daysUntilDue: number,
  ): DocumentExpiryAlertThreshold[] {
    const thresholds: DocumentExpiryAlertThreshold[] = [];
    if (daysUntilDue <= 30)
      thresholds.push(DocumentExpiryAlertThreshold.DUE_IN_30_DAYS);
    if (daysUntilDue <= 7)
      thresholds.push(DocumentExpiryAlertThreshold.DUE_IN_7_DAYS);
    if (daysUntilDue <= 0)
      thresholds.push(DocumentExpiryAlertThreshold.OVERDUE);
    return thresholds;
  }

  private async fireThreshold(
    staffDocumentId: string,
    threshold: DocumentExpiryAlertThreshold,
    context: { staffName: string; documentType: string; expiryDate: string },
  ): Promise<boolean> {
    try {
      await this.prisma.staffDocumentExpiryAlertLog.create({
        data: { staffDocumentId, threshold },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return false;
      }
      throw error;
    }

    await this.broadcasts.sendStaffDocumentExpiringAlert({
      staffName: context.staffName,
      documentType: context.documentType,
      expiryDate: context.expiryDate,
      thresholdLabel: THRESHOLD_LABELS[threshold],
      targetId: staffDocumentId,
    });
    return true;
  }
}
