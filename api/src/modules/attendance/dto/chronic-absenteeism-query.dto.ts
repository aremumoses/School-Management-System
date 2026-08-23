import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class ChronicAbsenteeismQueryDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  termId!: string;

  @ApiPropertyOptional({
    description:
      'Absence-rate percentage (0-100) above which a student is flagged — omit to use the school-configured default (100 - AtRiskThresholdConfig.attendanceRateFloor, see Stage 29)',
    example: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  threshold?: number;
}
