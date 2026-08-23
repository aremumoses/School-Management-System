import { Body, Controller, Get, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { AtRiskFlaggingService } from './at-risk-flagging.service';
import { AtRiskSettingsService } from './at-risk-settings.service';
import { UpdateAtRiskConfigDto } from './dto/update-at-risk-config.dto';

@ApiTags('at-risk')
@Controller('at-risk')
export class AtRiskSettingsController {
  constructor(
    private readonly settings: AtRiskSettingsService,
    private readonly flagging: AtRiskFlaggingService,
  ) {}

  @Roles('ADMIN')
  @Get('settings')
  @ApiOperation({
    summary:
      'The school-configurable at-risk thresholds — attendance-rate floor, CA-average floor, guardian-notify toggle',
  })
  get() {
    return this.settings.loadConfig();
  }

  @Roles('ADMIN')
  @Patch('settings')
  @ApiOperation({ summary: 'Update the at-risk thresholds' })
  update(@Body() dto: UpdateAtRiskConfigDto) {
    return this.settings.updateConfig(dto);
  }

  @Roles('ADMIN')
  @Post('run')
  @ApiOperation({
    summary:
      'Manually trigger the daily at-risk evaluation (same logic the 7am cron runs) — for testing/on-demand re-checks',
  })
  run() {
    return this.flagging.run();
  }
}
