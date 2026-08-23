import { Module } from '@nestjs/common';
import { FeeStructuresController } from './fee-structures.controller';
import { FeeStructuresService } from './fee-structures.service';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';

@Module({
  controllers: [FeeStructuresController, InvoicesController],
  providers: [FeeStructuresService, InvoicesService],
  exports: [InvoicesService, FeeStructuresService],
})
export class FeesModule {}
