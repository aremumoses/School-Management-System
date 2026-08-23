import { Module } from '@nestjs/common';
import { CommunicationModule } from '../communication/communication.module';
import { AtRiskFlaggingService } from './at-risk-flagging.service';
import { AtRiskSettingsService } from './at-risk-settings.service';
import { AtRiskSettingsController } from './at-risk.controller';

@Module({
  imports: [CommunicationModule],
  controllers: [AtRiskSettingsController],
  providers: [AtRiskSettingsService, AtRiskFlaggingService],
  // AttendanceModule and AssignmentsModule import this to read
  // AtRiskThresholdConfig for their own default-threshold resolution
  // (see AtRiskSettingsService's doc comment) — one-way dependency, no
  // cycle, since AtRiskFlaggingService queries Attendance/Score directly
  // via PrismaService rather than calling into either of those modules'
  // services. StudentsModule imports this too, for GET /students/at-risk
  // — that route lives in StudentsController (not here) specifically so
  // it's declared before StudentsController's ':id' route in the same
  // controller (see that file's comment — this was a real bug caught live).
  exports: [AtRiskSettingsService, AtRiskFlaggingService],
})
export class AtRiskModule {}
