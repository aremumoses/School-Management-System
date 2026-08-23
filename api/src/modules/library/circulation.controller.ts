import { Body, Controller, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { RequestUser } from '../../common/types/auth.types';
import { CirculationService } from './circulation.service';
import { CreateLoanDto, SettleFineWithInvoiceDto } from './dto/library.dto';

@ApiTags('library')
@Controller('library/loans')
export class CirculationController {
  constructor(private readonly circulationService: CirculationService) {}

  @Roles('LIBRARIAN')
  @Post()
  @ApiOperation({
    summary:
      'Issue a book — 400 if no copies are available or the borrower is already at their limit',
  })
  issue(@Body() dto: CreateLoanDto, @CurrentUser() user: RequestUser) {
    return this.circulationService.issue(dto, user);
  }

  @Roles('LIBRARIAN')
  @Post(':id/return')
  @ApiOperation({
    summary:
      'Return a book — calculates a fine if returned late, and flips the oldest waiting reservation on this title to Available',
  })
  return(@Param('id') id: string) {
    return this.circulationService.return(id);
  }

  @Roles('LIBRARIAN')
  @Post(':id/renew')
  @ApiOperation({
    summary:
      'Renew a loan — rejected if someone else has an active reservation on the title',
  })
  renew(@Param('id') id: string) {
    return this.circulationService.renew(id);
  }

  @Roles('LIBRARIAN')
  @Post(':id/settle-fine')
  @ApiOperation({
    summary: 'Settle a fine directly — cash-in-hand at the library desk',
  })
  settleFineDirect(@Param('id') id: string) {
    return this.circulationService.settleFineDirect(id);
  }

  @Roles('LIBRARIAN')
  @Post(':id/settle-fine/invoice')
  @ApiOperation({
    summary:
      'Settle a fine by raising an ad-hoc Invoice line item so it can be paid alongside school fees — student borrowers only',
  })
  settleFineWithInvoice(
    @Param('id') id: string,
    @Body() dto: SettleFineWithInvoiceDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.circulationService.settleFineWithInvoice(id, dto, user);
  }
}
