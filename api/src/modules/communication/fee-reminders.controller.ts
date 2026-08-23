import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { RunFeeRemindersDto } from './dto/fee-reminder.dto';
import { FeeRemindersService } from './fee-reminders.service';

@ApiTags('Communication — Fee Reminders')
@Controller('fee-reminders')
export class FeeRemindersController {
  constructor(private readonly feeRemindersService: FeeRemindersService) {}

  @Roles('ADMIN', 'BURSAR')
  @Post('run')
  run(@Body() dto: RunFeeRemindersDto) {
    return this.feeRemindersService.run({ dryRun: dto.dryRun });
  }
}
