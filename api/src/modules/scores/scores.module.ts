import { Module } from '@nestjs/common';
import { AssessmentModule } from '../assessment/assessment.module';
import { GradingModule } from '../../common/grading/grading.module';
import { ScoresBulkImportController } from './bulk-import/scores-bulk-import.controller';
import { ScoresBulkImportService } from './bulk-import/scores-bulk-import.service';
import { ScoresController } from './scores.controller';
import { ScoresService } from './scores.service';

@Module({
  imports: [AssessmentModule, GradingModule],
  controllers: [ScoresController, ScoresBulkImportController],
  providers: [ScoresService, ScoresBulkImportService],
  exports: [ScoresService],
})
export class ScoresModule {}
