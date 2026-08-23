import { Logger, OnModuleDestroy } from '@nestjs/common';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import type { Browser, Page } from 'puppeteer';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { puppeteerLaunchOptions } from '../../../common/utils/puppeteer-launch-options';
import { StorageService } from '../../../common/storage/storage.service';
import { ResultsService } from '../results.service';
import { REPORT_CARDS_QUEUE, ReportCardJobData } from './report-card.constants';
import { renderReportCardHtml } from './report-card.template';

/**
 * One job per student (docs/18-technical-architecture.md §5/§6) — rendering
 * ~40 PDFs synchronously inside a publish request would block it for
 * minutes, so ResultsService.enqueueReportCards hands each student off to
 * this queue and returns immediately.
 */
@Processor(REPORT_CARDS_QUEUE)
export class ReportCardProcessor extends WorkerHost implements OnModuleDestroy {
  private readonly logger = new Logger(ReportCardProcessor.name);
  // One Chromium instance shared across every job this worker processes —
  // launching a fresh browser per student would mean hundreds of cold
  // starts at a real term-end (a whole school's worth of report cards),
  // not just the handful in this app's test fixtures. Lazily created on
  // the first job, torn down in onModuleDestroy.
  private browserPromise: Promise<Browser> | null = null;

  constructor(
    private readonly resultsService: ResultsService,
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

  async process(job: Job<ReportCardJobData>): Promise<void> {
    const { studentId, armId, termId } = job.data;
    this.logger.log(`Generating report card for student ${studentId}`);

    const data = await this.resultsService.buildReportCardData(
      studentId,
      armId,
      termId,
    );
    const html = renderReportCardHtml(data);

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
          originalName: `report-card-${studentId}-${termId}.pdf`,
          mimeType: 'application/pdf',
        },
        'report-cards',
      );

      await this.prisma.studentTermResult.upsert({
        where: { studentId_termId: { studentId, termId } },
        update: { reportCardUrl: url, reportCardGeneratedAt: new Date() },
        create: {
          studentId,
          termId,
          armId,
          reportCardUrl: url,
          reportCardGeneratedAt: new Date(),
        },
      });
    } finally {
      await page.close().catch(() => undefined);
    }
  }

  /**
   * Opens a page on the shared browser, transparently relaunching once if
   * the cached browser's connection has died (e.g. Chrome got killed under
   * memory pressure) — without this, one crash silently fails every
   * subsequent job for the rest of this worker's lifetime, since the dead
   * browserPromise would otherwise never get replaced.
   */
  private async openPage(): Promise<Page> {
    let browser = await this.getBrowser();
    if (!browser.connected) {
      this.browserPromise = null;
      browser = await this.getBrowser();
    }
    try {
      return await browser.newPage();
    } catch {
      // The connection died between the check above and this call —
      // relaunch once more rather than failing the job outright.
      this.browserPromise = null;
      browser = await this.getBrowser();
      return await browser.newPage();
    }
  }

  /**
   * BullMQ fires 'failed' after every failed attempt, not just the final
   * one — so this only escalates to an error log once retries (see
   * ResultsModule's defaultJobOptions) are exhausted, since that's the
   * only point an Admin actually needs to step in and re-run
   * generate-report-cards for this student manually. Earlier attempts
   * just warn, since BullMQ is already retrying them on its own.
   */
  @OnWorkerEvent('failed')
  onFailed(job: Job<ReportCardJobData>): void {
    const exhausted = job.attemptsMade >= (job.opts.attempts ?? 1);
    const message = `Report card generation failed for student ${job.data.studentId} (arm ${job.data.armId}, term ${job.data.termId}), attempt ${job.attemptsMade}/${job.opts.attempts ?? 1}: ${job.failedReason}`;
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
      // Dynamic import — puppeteer's dependency tree is ESM-only
      // ("type": "module" several levels deep), which a static top-level
      // import can't survive under ts-jest's CJS transform (it doesn't
      // transform node_modules, and the ESM tree is too deep to allowlist
      // package-by-package). A dynamic import works under both Node's
      // normal runtime and Jest (run with --experimental-vm-modules — see
      // the "test:e2e" script in package.json).
      this.browserPromise = import('puppeteer').then(({ default: puppeteer }) =>
        puppeteer.launch(puppeteerLaunchOptions()),
      );
    }
    return this.browserPromise;
  }
}
