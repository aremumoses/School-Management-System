import { Logger, OnModuleDestroy } from '@nestjs/common';
import {
  InjectQueue,
  OnWorkerEvent,
  Processor,
  WorkerHost,
} from '@nestjs/bullmq';
import type { Job, Queue } from 'bullmq';
import type { Browser, Page } from 'puppeteer';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { StorageService } from '../../../common/storage/storage.service';
import {
  OFFER_LETTERS_QUEUE,
  OfferLetterJobData,
} from './offer-letter.constants';
import { renderOfferLetterHtml } from './offer-letter.template';

/**
 * Same Puppeteer + StorageService + BullMQ pattern as DocumentProcessor and
 * ReportCardProcessor — renders an offer letter HTML template to PDF via
 * Puppeteer, uploads it, and stores the URL on the Applicant row.
 * Enqueued by AdmissionsService.approve() once the Admin approves an applicant.
 */
@Processor(OFFER_LETTERS_QUEUE)
export class OfferLetterProcessor
  extends WorkerHost
  implements OnModuleDestroy
{
  private readonly logger = new Logger(OfferLetterProcessor.name);
  private browserPromise: Promise<Browser> | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    @InjectQueue(OFFER_LETTERS_QUEUE) private readonly queue: Queue,
  ) {
    super();
  }

  async onModuleDestroy(): Promise<void> {
    if (this.browserPromise) {
      const browser = await this.browserPromise.catch(() => null);
      await browser?.close().catch(() => undefined);
    }
  }

  async process(job: Job<OfferLetterJobData>): Promise<void> {
    const { applicantId } = job.data;
    this.logger.log(`Generating offer letter for applicant ${applicantId}`);

    const applicant = await this.prisma.applicant.findUniqueOrThrow({
      where: { id: applicantId },
    });

    const [school, currentTerm] = await Promise.all([
      this.prisma.school.findFirstOrThrow(),
      this.prisma.term.findFirst({ where: { isCurrent: true } }),
    ]);

    const html = renderOfferLetterHtml({
      applicant: {
        firstName: applicant.firstName,
        lastName: applicant.lastName,
        intendedClassLevel: applicant.intendedClassLevel,
      },
      guardian: {
        firstName: applicant.guardianFirstName,
        lastName: applicant.guardianLastName,
      },
      school: {
        name: school.name,
        logoUrl: school.logoUrl,
        address: school.address,
        primaryColor: school.documentPrimaryColor ?? '#4F46E5',
      },
      resumptionDate: currentTerm?.startDate ?? new Date(),
    });

    const page = await this.openPage();
    try {
      await page.setContent(html, { waitUntil: 'load' });
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '0mm', bottom: '0mm', left: '0mm', right: '0mm' },
      });

      const { url } = await this.storageService.upload(
        {
          buffer: Buffer.from(pdfBuffer),
          originalName: `offer-letter-${applicantId}.pdf`,
          mimeType: 'application/pdf',
        },
        'offer-letters',
      );

      await this.prisma.applicant.update({
        where: { id: applicantId },
        data: { offerLetterUrl: url },
      });
    } finally {
      await page.close().catch(() => undefined);
    }
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<OfferLetterJobData>): void {
    const exhausted = job.attemptsMade >= (job.opts.attempts ?? 1);
    const msg = `Offer letter generation failed for applicant ${job.data.applicantId}, attempt ${job.attemptsMade}/${job.opts.attempts ?? 1}: ${job.failedReason}`;
    if (exhausted) {
      this.logger.error(`${msg} — all retries exhausted.`);
    } else {
      this.logger.warn(msg);
    }
  }

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

  private getBrowser(): Promise<Browser> {
    if (!this.browserPromise) {
      this.browserPromise = import('puppeteer').then(({ default: puppeteer }) =>
        puppeteer.launch({ headless: true }),
      );
    }
    return this.browserPromise;
  }
}
