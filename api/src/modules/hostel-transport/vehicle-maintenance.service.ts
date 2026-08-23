import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Prisma, VehicleMaintenanceAlertThreshold } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { RequestUser } from '../../common/types/auth.types';
import { BroadcastsService } from '../communication/broadcasts.service';
import { CreateVehicleMaintenanceDto } from './dto/transport.dto';

const THRESHOLD_LABELS: Record<VehicleMaintenanceAlertThreshold, string> = {
  DUE_IN_14_DAYS: 'due within 14 days',
  DUE_IN_7_DAYS: 'due within 7 days',
  OVERDUE: 'overdue',
};

/**
 * Same "log table + unique constraint absorbs the race, `<=` comparison so
 * a missed day still catches up" shape as
 * communication/fee-reminders.service.ts's FeeReminderLog/eligibleThresholds
 * — mirrored here for "vehicle service due soon" instead of "fee due soon."
 */
@Injectable()
export class VehicleMaintenanceService {
  private readonly logger = new Logger(VehicleMaintenanceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly broadcasts: BroadcastsService,
  ) {}

  create(dto: CreateVehicleMaintenanceDto, user: RequestUser) {
    return this.prisma.vehicleMaintenanceRecord.create({
      data: {
        busIdentifier: dto.busIdentifier,
        serviceDate: new Date(dto.serviceDate),
        description: dto.description,
        cost: dto.cost,
        nextServiceDueDate: dto.nextServiceDueDate
          ? new Date(dto.nextServiceDueDate)
          : null,
        loggedByStaffId: user.id,
      },
    });
  }

  list(busIdentifier?: string) {
    return this.prisma.vehicleMaintenanceRecord.findMany({
      where: { ...(busIdentifier && { busIdentifier }) },
      include: {
        loggedBy: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { serviceDate: 'desc' },
    });
  }

  /** The latest record per bus that has a nextServiceDueDate — what "due for service" badges/alerts key off. */
  async getDueSoon(): Promise<
    {
      busIdentifier: string;
      nextServiceDueDate: Date;
      daysUntilDue: number;
      recordId: string;
    }[]
  > {
    const records = await this.prisma.vehicleMaintenanceRecord.findMany({
      where: { nextServiceDueDate: { not: null } },
      orderBy: { serviceDate: 'desc' },
    });
    const latestByBus = new Map<string, (typeof records)[number]>();
    for (const record of records) {
      if (!latestByBus.has(record.busIdentifier)) {
        latestByBus.set(record.busIdentifier, record);
      }
    }

    const now = Date.now();
    return [...latestByBus.values()].map((r) => ({
      busIdentifier: r.busIdentifier,
      nextServiceDueDate: r.nextServiceDueDate!,
      daysUntilDue: Math.ceil(
        (r.nextServiceDueDate!.getTime() - now) / 86_400_000,
      ),
      recordId: r.id,
    }));
  }

  @Cron(CronExpression.EVERY_DAY_AT_7AM)
  async runDaily(): Promise<void> {
    const dueSoon = await this.getDueSoon();
    let fired = 0;
    for (const bus of dueSoon) {
      const eligible = this.eligibleThresholds(bus.daysUntilDue);
      for (const threshold of eligible) {
        const didFire = await this.fireThreshold(
          bus.recordId,
          bus.busIdentifier,
          bus.nextServiceDueDate,
          threshold,
        );
        if (didFire) fired += 1;
      }
    }
    this.logger.log(
      `Daily vehicle-maintenance run: checked ${dueSoon.length} buses, fired ${fired} alerts.`,
    );
  }

  // `<=` not `===` — same reasoning as FeeRemindersService.eligibleThresholds:
  // a daily cron catching up after downtime should still fire a threshold
  // it missed rather than silently skip it forever.
  private eligibleThresholds(
    daysUntilDue: number,
  ): VehicleMaintenanceAlertThreshold[] {
    const thresholds: VehicleMaintenanceAlertThreshold[] = [];
    if (daysUntilDue <= 14)
      thresholds.push(VehicleMaintenanceAlertThreshold.DUE_IN_14_DAYS);
    if (daysUntilDue <= 7)
      thresholds.push(VehicleMaintenanceAlertThreshold.DUE_IN_7_DAYS);
    if (daysUntilDue <= 0)
      thresholds.push(VehicleMaintenanceAlertThreshold.OVERDUE);
    return thresholds;
  }

  private async fireThreshold(
    recordId: string,
    busIdentifier: string,
    dueDate: Date,
    threshold: VehicleMaintenanceAlertThreshold,
  ): Promise<boolean> {
    try {
      await this.prisma.vehicleMaintenanceAlertLog.create({
        data: { maintenanceRecordId: recordId, threshold },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return false; // already fired for this record+threshold — silent no-op
      }
      throw error;
    }

    await this.broadcasts.sendVehicleMaintenanceAlert({
      busIdentifier,
      nextServiceDueDate: dueDate.toISOString().slice(0, 10),
      thresholdLabel: THRESHOLD_LABELS[threshold],
      maintenanceRecordId: recordId,
    });
    return true;
  }
}
