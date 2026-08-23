import { Module } from '@nestjs/common';
import { AtRiskModule } from '../at-risk/at-risk.module';
import { CommunicationModule } from '../communication/communication.module';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { AttendanceEventsListener } from './events/attendance-events.listener';

@Module({
  imports: [CommunicationModule, AtRiskModule],
  controllers: [AttendanceController],
  providers: [AttendanceService, AttendanceEventsListener],
  exports: [AttendanceService],
})
export class AttendanceModule {}
