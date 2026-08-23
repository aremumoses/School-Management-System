import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

export class UpdateScoreEntryDeadlineDto {
  @ApiPropertyOptional({
    description: 'New score-entry deadline, or omit/null to clear it',
  })
  @IsOptional()
  @IsDateString()
  scoreEntryDeadline?: string | null;
}
