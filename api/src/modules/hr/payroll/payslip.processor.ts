import { Logger, OnModuleDestroy } from '@nestjs/common';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import type { Browser, Page } from 'puppeteer';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { StorageService } from '../../../common/storage/storage.service';
import { PayrollService } from '../payroll.service';
import { PAYSLIPS_QUEUE, PayslipJobData } from './payslip.constants';
import { renderPayslipHtml } from './payslip.template';

/**
 * One job per payslip on payroll-run approval — mirrors Stage 15's
 * ReceiptProcessor (same Puppeteer pipeline, a payslip template instead of
 * a receipt) so generating dozens of PDFs never blocks the approve request.
 */
@Processor(PAYSLIPS_QUEUE)
export class PayslipProcessor extends WorkerHost implements OnModuleDestroy {
  private readonly logger = new Logger(PayslipProcessor.name);
  private browserPromise: Promise<Browser> | null = null;

  constructor(
    private readonly payrollService: PayrollService,
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

  async process(job: Job<PayslipJobData>): Promise<void> {
    const { payslipId } = job.data;
    this.logger.log(`Generating payslip PDF for ${payslipId}`);

    const data = await this.payrollService.buildPayslipData(payslipId);
    const html = renderPayslipHtml(data);

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
          originalName: `payslip-${payslipId}.pdf`,
          mimeType: 'application/pdf',
        },
        'payslips',
      );

      await this.prisma.payslip.update({
        where: { id: payslipId },
        data: { pdfUrl: url, generatedAt: new Date() },
      });
    } finally {
      await page.close().catch(() => undefined);
    }
  }

  /** Same relaunch-on-dead-connection resilience as ReceiptProcessor/ReportCardProcessor. */
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
  onFailed(job: Job<PayslipJobData>): void {
    const exhausted = job.attemptsMade >= (job.opts.attempts ?? 1);
    const message = `Payslip generation failed for ${job.data.payslipId}, attempt ${job.attemptsMade}/${job.opts.attempts ?? 1}: ${job.failedReason}`;
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
      // Dynamic import — see ReceiptProcessor's identical comment;
      // puppeteer's dependency tree is ESM-only.
      this.browserPromise = import('puppeteer').then(({ default: puppeteer }) =>
        puppeteer.launch({ headless: true }),
      );
    }
    return this.browserPromise;
  }
}
