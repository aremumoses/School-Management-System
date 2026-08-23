import { Module } from '@nestjs/common';
import { AtRiskModule } from '../at-risk/at-risk.module';
import { BulkImportController } from './bulk-import/bulk-import.controller';
import { BulkImportService } from './bulk-import/bulk-import.service';
import { GuardiansController } from './guardians.controller';
import { GuardiansService } from './guardians.service';
import { StudentsController } from './students.controller';
import { StudentsService } from './students.service';

@Module({
  imports: [AtRiskModule],
  controllers: [StudentsController, GuardiansController, BulkImportController],
  providers: [StudentsService, GuardiansService, BulkImportService],
  exports: [StudentsService, GuardiansService],
})
export class StudentsModule {}
