import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { FeesModule } from '../fees/fees.module';
import { PaymentPlansController } from './payment-plans.controller';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PaystackService } from './paystack.service';
import { ReceiptProcessor } from './receipt/receipt.processor';
import { RECEIPTS_QUEUE } from './receipt/receipt.constants';
import { WebhooksController } from './webhooks.controller';

@Module({
  imports: [
    FeesModule,
    // Stage 11 hardening — webhook-flood protection on /webhooks/paystack
    // specifically (bound via @UseGuards(ThrottlerGuard) on WebhooksController
    // only, not globally — PaymentsController/PaymentPlansController are
    // unaffected). 30/min comfortably covers legitimate Paystack retries.
    // skipIf NODE_ENV==='test' — same reasoning as AuthModule's identical
    // comment; kept consistent here so future webhook e2e coverage doesn't
    // hit the same flakiness risk even though today's test count (7 calls)
    // is already under this limit.
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60_000,
        limit: 30,
        skipIf: () => process.env.NODE_ENV === 'test',
      },
    ]),
    BullModule.registerQueue({
      name: RECEIPTS_QUEUE,
      // Same reasoning as ResultsModule's report-cards queue — retry a
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
  controllers: [PaymentsController, WebhooksController, PaymentPlansController],
  providers: [PaymentsService, PaystackService, ReceiptProcessor],
  exports: [PaymentsService, PaystackService],
})
export class PaymentsModule {}
