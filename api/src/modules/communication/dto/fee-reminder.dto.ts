import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class RunFeeRemindersDto {
  @ApiPropertyOptional({
    description:
      'Preview only — reports which invoices/thresholds would fire without sending anything or recording FeeReminderLog rows.',
  })
  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;
}
