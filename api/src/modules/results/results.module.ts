import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { AssessmentModule } from '../assessment/assessment.module';
import { GradingModule } from '../../common/grading/grading.module';
import { RankingModule } from '../../common/ranking/ranking.module';
import { ScoresModule } from '../scores/scores.module';
import { REPORT_CARDS_QUEUE } from './report-card/report-card.constants';
import { ReportCardProcessor } from './report-card/report-card.processor';
import { ResultsController } from './results.controller';
import { ResultsService } from './results.service';

@Module({
  imports: [
    AssessmentModule,
    ScoresModule,
    GradingModule,
    RankingModule,
    BullModule.registerQueue({
      name: REPORT_CARDS_QUEUE,
      // A transient failure (Chrome crashing under memory pressure, a
      // momentary blip talking to storage) shouldn't permanently leave a
      // student without a report card with nobody finding out until a
      // parent complains — retry with backoff before giving up, and
      // ReportCardProcessor's 'failed' listener logs whatever does
      // ultimately exhaust its attempts so an Admin knows to re-run
      // generate-report-cards for that arm/term.
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        // BullMQ keeps every job's data/result in Redis indefinitely by
        // default — at a real school (hundreds of students x multiple
        // terms x years) that's an unbounded leak. Keep enough completed
        // jobs to spot-check recent runs and enough failures to debug a
        // cluster of them, and let the rest age out.
        removeOnComplete: { count: 500 },
        removeOnFail: { count: 2000 },
      },
    }),
  ],
  controllers: [ResultsController],
  providers: [ResultsService, ReportCardProcessor],
  exports: [ResultsService],
})
export class ResultsModule {}
