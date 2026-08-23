import { Module } from '@nestjs/common';
import { AtRiskModule } from '../at-risk/at-risk.module';
import { CommunicationModule } from '../communication/communication.module';
import { AssignmentRemindersService } from './assignment-reminders.service';
import {
  AssignmentsController,
  GradebookController,
} from './assignments.controller';
import { AssignmentsService } from './assignments.service';
import { GradebookService } from './gradebook.service';

@Module({
  imports: [CommunicationModule, AtRiskModule],
  controllers: [AssignmentsController, GradebookController],
  providers: [AssignmentsService, AssignmentRemindersService, GradebookService],
  exports: [AssignmentsService],
})
export class AssignmentsModule {}
