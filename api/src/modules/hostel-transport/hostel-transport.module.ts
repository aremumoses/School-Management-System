import { Module } from '@nestjs/common';
import { CommunicationModule } from '../communication/communication.module';
import { HostelCareController } from './hostel-care.controller';
import { HostelCareService } from './hostel-care.service';
import { HostelRollCallController } from './hostel-roll-call.controller';
import { HostelRollCallService } from './hostel-roll-call.service';
import { HostelRoomsController } from './hostel-rooms.controller';
import { HostelRoomsService } from './hostel-rooms.service';
import { LeaveRequestsController } from './leave-requests.controller';
import { LeaveRequestsService } from './leave-requests.service';
import { TransportAttendanceController } from './transport-attendance.controller';
import { TransportAttendanceService } from './transport-attendance.service';
import { TransportRoutesController } from './transport-routes.controller';
import { TransportRoutesService } from './transport-routes.service';
import { VehicleMaintenanceController } from './vehicle-maintenance.controller';
import { VehicleMaintenanceService } from './vehicle-maintenance.service';

@Module({
  imports: [CommunicationModule],
  controllers: [
    HostelRoomsController,
    HostelRollCallController,
    HostelCareController,
    LeaveRequestsController,
    TransportRoutesController,
    TransportAttendanceController,
    VehicleMaintenanceController,
  ],
  providers: [
    HostelRoomsService,
    HostelRollCallService,
    HostelCareService,
    LeaveRequestsService,
    TransportRoutesService,
    TransportAttendanceService,
    VehicleMaintenanceService,
  ],
})
export class HostelTransportModule {}
