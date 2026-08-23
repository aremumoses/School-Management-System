import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { DocumentProcessor } from './document/document.processor';
import { DOCUMENTS_QUEUE } from './document/document.constants';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';

@Module({
  imports: [
    // StorageModule is @Global() — no explicit import needed (same as
    // every other module using it).
    BullModule.registerQueue({
      name: DOCUMENTS_QUEUE,
      // Same reasoning as the report-cards/receipts queues — retry a
      // transient Puppeteer/storage failure before giving up, and don't
      // let completed/failed job records accumulate in Redis forever.
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: { count: 500 },
        removeOnFail: { count: 2000 },
      },
    }),
  ],
  controllers: [DocumentsController],
  providers: [DocumentsService, DocumentProcessor],
})
export class DocumentsModule {}
