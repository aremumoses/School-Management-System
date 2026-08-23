import { Module } from '@nestjs/common';
import { GradingModule } from '../../common/grading/grading.module';
import { AssessmentModule } from '../assessment/assessment.module';
import { CommunicationModule } from '../communication/communication.module';
import { ScoresModule } from '../scores/scores.module';
import { ExamSessionsController } from './exam-sessions.controller';
import { ExamSessionsService } from './exam-sessions.service';
import {
  ExternalExamsController,
  StudentCaSummaryController,
} from './external-exams.controller';
import { ExternalExamsService } from './external-exams.service';
import {
  InvigilationDutyController,
  InvigilationRosterController,
} from './invigilation.controller';
import { InvigilationService } from './invigilation.service';
import { MalpracticeController } from './malpractice.controller';
import { MalpracticeService } from './malpractice.service';
import { StatisticsController } from './statistics.controller';
import { StatisticsService } from './statistics.service';

@Module({
  imports: [AssessmentModule, ScoresModule, GradingModule, CommunicationModule],
  controllers: [
    ExamSessionsController,
    InvigilationDutyController,
    InvigilationRosterController,
    ExternalExamsController,
    StudentCaSummaryController,
    MalpracticeController,
    StatisticsController,
  ],
  providers: [
    ExamSessionsService,
    InvigilationService,
    ExternalExamsService,
    MalpracticeService,
    StatisticsService,
  ],
})
export class ExamLogisticsModule {}
