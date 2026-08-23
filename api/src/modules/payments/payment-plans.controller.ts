import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { RequestUser } from '../../common/types/auth.types';
import { CreatePaymentPlanDto } from './dto/payment.dto';
import { PaymentsService } from './payments.service';

@ApiTags('invoices')
@Controller('invoices')
export class PaymentPlansController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Roles('BURSAR')
  @Post(':id/payment-plan')
  @ApiOperation({
    summary: 'Split an invoice into dated installments (docs §5)',
  })
  create(
    @Param('id') invoiceId: string,
    @Body() dto: CreatePaymentPlanDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.paymentsService.createPaymentPlan(invoiceId, dto, user);
  }

  @Roles('ADMIN', 'VICE_PRINCIPAL', 'BURSAR', 'STUDENT', 'PARENT')
  @Get(':id/payment-plan')
  @ApiOperation({ summary: "An invoice's installment schedule, if one exists" })
  getOne(@Param('id') invoiceId: string, @CurrentUser() user: RequestUser) {
    return this.paymentsService.getPaymentPlan(invoiceId, user);
  }
}
