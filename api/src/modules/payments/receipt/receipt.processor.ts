import { Logger, OnModuleDestroy } from '@nestjs/common';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import type { Browser, Page } from 'puppeteer';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { StorageService } from '../../../common/storage/storage.service';
import { PaymentsService } from '../payments.service';
import { RECEIPTS_QUEUE, ReceiptJobData } from './receipt.constants';
import { renderReceiptHtml } from './receipt.template';

/**
 * One job per confirmed payment (docs/15-module-fees-payments.md §3) —
 * mirrors Stage 5's ReportCardProcessor (same Puppeteer pipeline, a
 * receipt template instead of a report card) so a slow PDF render never
 * blocks the webhook/manual-payment request that confirmed the payment.
 */
@Processor(RECEIPTS_QUEUE)
export class ReceiptProcessor extends WorkerHost implements OnModuleDestroy {
  private readonly logger = new Logger(ReceiptProcessor.name);
  private browserPromise: Promise<Browser> | null = null;

  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly storageService: StorageService,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  async onModuleDestroy(): Promise<void> {
    if (this.browserPromise) {
      const browser = await this.browserPromise.catch(() => null);
      await browser?.close().catch(() => undefined);
    }
  }

  async process(job: Job<ReceiptJobData>): Promise<void> {
    const { paymentId } = job.data;
    this.logger.log(`Generating receipt for payment ${paymentId}`);

    const data = await this.paymentsService.buildReceiptData(paymentId);
    const html = renderReceiptHtml(data);

    const page = await this.openPage();
    try {
      await page.setContent(html, { waitUntil: 'load' });
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' },
      });

      const { url } = await this.storageService.upload(
        {
          buffer: Buffer.from(pdfBuffer),
          originalName: `receipt-${paymentId}.pdf`,
          mimeType: 'application/pdf',
        },
        'receipts',
      );

      await this.prisma.payment.update({
        where: { id: paymentId },
        data: { receiptUrl: url, receiptGeneratedAt: new Date() },
      });
    } finally {
      await page.close().catch(() => undefined);
    }
  }

  /** Same relaunch-on-dead-connection resilience as ReportCardProcessor. */
  private async openPage(): Promise<Page> {
    let browser = await this.getBrowser();
    if (!browser.connected) {
      this.browserPromise = null;
      browser = await this.getBrowser();
    }
    try {
      return await browser.newPage();
    } catch {
      this.browserPromise = null;
      browser = await this.getBrowser();
      return await browser.newPage();
    }
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<ReceiptJobData>): void {
    const exhausted = job.attemptsMade >= (job.opts.attempts ?? 1);
    const message = `Receipt generation failed for payment ${job.data.paymentId}, attempt ${job.attemptsMade}/${job.opts.attempts ?? 1}: ${job.failedReason}`;
    if (exhausted) {
      this.logger.error(
        `${message} — all retries exhausted, manual re-run required.`,
      );
    } else {
      this.logger.warn(message);
    }
  }

  private getBrowser(): Promise<Browser> {
    if (!this.browserPromise) {
      // Dynamic import — see ReportCardProcessor's identical comment;
      // puppeteer's dependency tree is ESM-only.
      this.browserPromise = import('puppeteer').then(({ default: puppeteer }) =>
        puppeteer.launch({ headless: true }),
      );
    }
    return this.browserPromise;
  }
}
