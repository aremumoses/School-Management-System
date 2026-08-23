import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { CommunicationModule } from '../communication/communication.module';
import { PaymentsModule } from '../payments/payments.module';
import { AdmissionsController } from './admissions.controller';
import { AdmissionsService } from './admissions.service';
import { OFFER_LETTERS_QUEUE } from './offer-letter/offer-letter.constants';
import { OfferLetterProcessor } from './offer-letter/offer-letter.processor';

@Module({
  imports: [
    // Stage 11 throttler pattern: public /admissions/apply needs rate limiting
    // but has no JWT guard to fall back on; skipIf guards the e2e suite from
    // false-positive lockouts (same reasoning as AuthModule's identical comment).
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60_000,
        limit: 10,
        skipIf: () => process.env.NODE_ENV === 'test',
      },
    ]),
    BullModule.registerQueue({
      name: OFFER_LETTERS_QUEUE,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: { count: 500 },
        removeOnFail: { count: 2000 },
      },
    }),
    CommunicationModule,
    PaymentsModule,
  ],
  controllers: [AdmissionsController],
  providers: [AdmissionsService, OfferLetterProcessor],
  exports: [AdmissionsService],
})
export class AdmissionsModule {}
