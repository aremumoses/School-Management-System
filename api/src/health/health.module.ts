import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { OFFER_LETTERS_QUEUE } from '../modules/admissions/offer-letter/offer-letter.constants';
import { DOCUMENTS_QUEUE } from '../modules/documents/document/document.constants';
import { PAYSLIPS_QUEUE } from '../modules/hr/payroll/payslip.constants';
import { RECEIPTS_QUEUE } from '../modules/payments/receipt/receipt.constants';
import { REPORT_CARDS_QUEUE } from '../modules/results/report-card/report-card.constants';
import { HealthController } from './health.controller';

@Module({
  imports: [
    // Registering the same queue names already registered in
    // documents/payments/results/admissions/hr modules is safe and
    // standard — BullMQ + Nest share the underlying queue instance by
    // name+connection, this just makes them injectable here too for the
    // Stage 11 /health/detailed endpoint (queue depth + last-job-timestamp
    // per queue). Stage 31 added offer-letters (Stage 12) and payslips
    // (Stage 26), which existed before but were never wired in here — a
    // stuck worker on either was just as invisible as the original gap
    // Stage 11 closed.
    BullModule.registerQueue(
      { name: DOCUMENTS_QUEUE },
      { name: RECEIPTS_QUEUE },
      { name: REPORT_CARDS_QUEUE },
      { name: OFFER_LETTERS_QUEUE },
      { name: PAYSLIPS_QUEUE },
    ),
  ],
  controllers: [HealthController],
})
export class HealthModule {}
