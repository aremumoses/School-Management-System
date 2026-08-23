import { Logger, OnModuleDestroy } from '@nestjs/common';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import type { Browser, Page } from 'puppeteer';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { StorageService } from '../../../common/storage/storage.service';
import { DocumentsService } from '../documents.service';
import { DOCUMENTS_QUEUE, DocumentJobData } from './document.constants';
import { renderDocumentHtml } from './document.template';

/**
 * One job per approved document — same Puppeteer pipeline as Stage 5's
 * ReportCardProcessor and Stage 6's ReceiptProcessor (docs prompt §3:
 * "reuse the Puppeteer + StorageService pattern... same pipeline, new
 * templates"). Only ever enqueued from DocumentsService.approve(), never
 * at request time — see GeneratedDocument's schema comment for why.
 */
@Processor(DOCUMENTS_QUEUE)
export class DocumentProcessor extends WorkerHost implements OnModuleDestroy {
  private readonly logger = new Logger(DocumentProcessor.name);
  private browserPromise: Promise<Browser> | null = null;

  constructor(
    private readonly documentsService: DocumentsService,
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

  async process(job: Job<DocumentJobData>): Promise<void> {
    const { documentId } = job.data;
    this.logger.log(`Generating document ${documentId}`);

    const data = await this.documentsService.buildDocumentData(documentId);
    const html = renderDocumentHtml(data);

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
          originalName: `${data.document.type.toLowerCase()}-${documentId}.pdf`,
          mimeType: 'application/pdf',
        },
        'documents',
      );

      await this.prisma.generatedDocument.update({
        where: { id: documentId },
        data: { url, generatedAt: new Date() },
      });
    } finally {
      await page.close().catch(() => undefined);
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

  @OnWorkerEvent('failed')
  onFailed(job: Job<DocumentJobData>): void {
    const exhausted = job.attemptsMade >= (job.opts.attempts ?? 1);
    const message = `Document generation failed for document ${job.data.documentId}, attempt ${job.attemptsMade}/${job.opts.attempts ?? 1}: ${job.failedReason}`;
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
