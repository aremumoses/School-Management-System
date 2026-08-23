import { Module } from '@nestjs/common';
import { StaffBulkImportController } from './bulk-import/staff-bulk-import.controller';
import { StaffBulkImportService } from './bulk-import/staff-bulk-import.service';
import { StaffController } from './staff.controller';
import { StaffService } from './staff.service';

@Module({
  controllers: [StaffController, StaffBulkImportController],
  providers: [StaffService, StaffBulkImportService],
  exports: [StaffService],
})
export class StaffModule {}
