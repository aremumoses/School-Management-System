import { Module } from '@nestjs/common';
import { FinanceReportsController } from './finance-reports.controller';
import { FinanceReportsService } from './finance-reports.service';

@Module({
  controllers: [FinanceReportsController],
  providers: [FinanceReportsService],
})
export class FinanceReportsModule {}
