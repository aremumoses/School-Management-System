import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString } from 'class-validator';

export class QueryClassAttendanceDto {
  @ApiProperty({ example: '2026-05-04' })
  @IsDateString()
  date!: string;

  @ApiPropertyOptional({
    description:
      'Filter to a single period/subject. Omit for the whole-day register.',
  })
  @IsOptional()
  @IsString()
  classSubjectId?: string;
}
