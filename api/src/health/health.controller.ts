import { InjectQueue } from '@nestjs/bullmq';
import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Queue } from 'bullmq';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { PrismaService } from '../common/prisma/prisma.service';
import { OFFER_LETTERS_QUEUE } from '../modules/admissions/offer-letter/offer-letter.constants';
import { DOCUMENTS_QUEUE } from '../modules/documents/document/document.constants';
import { PAYSLIPS_QUEUE } from '../modules/hr/payroll/payslip.constants';
import { RECEIPTS_QUEUE } from '../modules/payments/receipt/receipt.constants';
import { REPORT_CARDS_QUEUE } from '../modules/results/report-card/report-card.constants';

interface QueueHealth {
  name: string;
  waiting: number;
  active: number;
  failed: number;
  delayed: number;
  /** ISO timestamp of the most recently completed job, or null if none has ever completed. */
  lastCompletedAt: string | null;
}

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(DOCUMENTS_QUEUE) private readonly documentsQueue: Queue,
    @InjectQueue(RECEIPTS_QUEUE) private readonly receiptsQueue: Queue,
    @InjectQueue(REPORT_CARDS_QUEUE) private readonly reportCardsQueue: Queue,
    @InjectQueue(OFFER_LETTERS_QUEUE) private readonly offerLettersQueue: Queue,
    @InjectQueue(PAYSLIPS_QUEUE) private readonly payslipsQueue: Queue,
  ) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Liveness + database + Redis connectivity check' })
  async check(): Promise<{ status: string; db: string; redis: string }> {
    const [db, redis] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
    ]);
    if (db !== 'connected' || redis !== 'connected') {
      throw new ServiceUnavailableException({
        status: 'error',
        db,
        redis,
      });
    }
    return { status: 'ok', db, redis };
  }

  // ADMIN-only rather than @Public() — this leaks operational detail (queue
  // depth, job timing) that's useful for an attacker's reconnaissance and
  // useless to a load balancer's liveness probe, the only consumer /health
  // itself needs to serve unauthenticated. No separate internal-network/API-key
  // gate exists elsewhere in this codebase to reuse, so this reuses the same
  // JWT+role mechanism every other admin-only endpoint already relies on.
  @Roles('ADMIN')
  @Get('detailed')
  @ApiOperation({
    summary:
      'Internal — per-queue depth and last-successful-job timestamp, for noticing a stuck worker before a parent does',
  })
  async detailed(): Promise<{ queues: QueueHealth[] }> {
    const queues = await Promise.all([
      this.queueHealth('documents', this.documentsQueue),
      this.queueHealth('receipts', this.receiptsQueue),
      this.queueHealth('report-cards', this.reportCardsQueue),
      this.queueHealth('offer-letters', this.offerLettersQueue),
      this.queueHealth('payslips', this.payslipsQueue),
    ]);
    return { queues };
  }

  private async checkDatabase(): Promise<string> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return 'connected';
    } catch {
      return 'unreachable';
    }
  }

  private async checkRedis(): Promise<string> {
    try {
      // Reuses one of the existing BullMQ queue connections rather than
      // opening a dedicated client just for this. BullMQ's IRedisClient
      // abstraction (it supports ioredis/node-redis/Bun under one
      // interface) doesn't expose PING, but INFO is part of that interface
      // and only succeeds against a live connection — equally sufficient
      // as a connectivity probe.
      const client = await this.documentsQueue.client;
      await client.info();
      return 'connected';
    } catch {
      return 'unreachable';
    }
  }

  private async queueHealth(name: string, queue: Queue): Promise<QueueHealth> {
    const [counts, lastCompleted] = await Promise.all([
      queue.getJobCounts('waiting', 'active', 'failed', 'delayed'),
      // Most-recently-completed job first — BullMQ's completed set is
      // retrieved newest-first by default, so index 0 is what we want.
      queue.getCompleted(0, 0),
    ]);
    const lastCompletedAt = lastCompleted[0]?.finishedOn
      ? new Date(lastCompleted[0].finishedOn).toISOString()
      : null;
    return {
      name,
      waiting: counts.waiting ?? 0,
      active: counts.active ?? 0,
      failed: counts.failed ?? 0,
      delayed: counts.delayed ?? 0,
      lastCompletedAt,
    };
  }
}
