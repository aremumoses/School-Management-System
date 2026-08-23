import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { PaymentMethod } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { RequestUser } from '../../common/types/auth.types';
import { CheckoutDto, ManualPaymentDto } from './dto/payment.dto';
import { PaymentsService } from './payments.service';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Roles('ADMIN', 'VICE_PRINCIPAL', 'BURSAR')
  @Get()
  @ApiQuery({ name: 'termId', required: false })
  @ApiQuery({
    name: 'method',
    required: false,
    enum: ['CASH', 'BANK_TRANSFER', 'POS', 'PAYSTACK'],
  })
  @ApiOperation({
    summary:
      'All recorded payments (newest first) with student name and receipt URL — the Bursar receipts screen',
  })
  list(
    @Query('termId') termId?: string,
    @Query('method') method?: PaymentMethod,
  ) {
    return this.paymentsService.listPayments({ termId, method });
  }

  @Roles('BURSAR', 'STUDENT', 'PARENT')
  @Post('checkout')
  @ApiOperation({
    summary:
      'Start a Paystack checkout for an invoice — returns the hosted page URL to open',
  })
  checkout(@Body() dto: CheckoutDto, @CurrentUser() user: RequestUser) {
    return this.paymentsService.checkout(dto, user);
  }

  @Roles('BURSAR')
  @Post('manual')
  @ApiOperation({
    summary: 'Record a cash/transfer/POS payment taken in person',
  })
  manual(@Body() dto: ManualPaymentDto, @CurrentUser() user: RequestUser) {
    return this.paymentsService.recordManualPayment(dto, user);
  }

  @Roles('BURSAR')
  @Post(':id/regenerate-receipt')
  @ApiOperation({
    summary:
      "Re-queue a payment's receipt PDF — recovery path for the rare case where generation exhausted its retries",
  })
  regenerateReceipt(@Param('id') paymentId: string) {
    return this.paymentsService.regenerateReceipt(paymentId);
  }
}
