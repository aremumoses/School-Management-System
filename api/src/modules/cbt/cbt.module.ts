import { Module } from '@nestjs/common';
import { CBTAttemptsService } from './cbt-attempts.service';
import { CBTTestsService } from './cbt-tests.service';
import {
  CBTController,
  MockHistoryController,
  QuestionsController,
} from './cbt.controller';
import { QuestionsService } from './questions.service';

@Module({
  controllers: [QuestionsController, CBTController, MockHistoryController],
  providers: [QuestionsService, CBTTestsService, CBTAttemptsService],
  exports: [CBTTestsService, CBTAttemptsService],
})
export class CBTModule {}
