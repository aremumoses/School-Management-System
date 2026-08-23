import { Module } from '@nestjs/common';
import { AssessmentModule } from '../assessment/assessment.module';
import { GradingModule } from '../../common/grading/grading.module';
import { ScoresModule } from '../scores/scores.module';
import { StudentsModule } from '../students/students.module';
import { PromotionController } from './promotion.controller';
import { PromotionService } from './promotion.service';
import { StudentAcademicController } from './student-academic.controller';
import { TranscriptService } from './transcript.service';

@Module({
  imports: [StudentsModule, AssessmentModule, ScoresModule, GradingModule],
  controllers: [PromotionController, StudentAcademicController],
  providers: [PromotionService, TranscriptService],
  exports: [PromotionService, TranscriptService],
})
export class PromotionModule {}
