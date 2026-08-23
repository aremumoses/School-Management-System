import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export class CreatePeriodDto {
  @ApiProperty({ example: 'Period 1' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: '08:00', description: '24h HH:MM' })
  @Matches(TIME_PATTERN, { message: 'startTime must be HH:MM (24h)' })
  startTime!: string;

  @ApiProperty({ example: '08:40', description: '24h HH:MM' })
  @Matches(TIME_PATTERN, { message: 'endTime must be HH:MM (24h)' })
  endTime!: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class UpdatePeriodDto extends PartialType(CreatePeriodDto) {}

export class CreateTimetableEntryDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  armId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  classSubjectId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  periodId!: string;

  @ApiProperty({ description: 'ISO weekday: 1 = Monday … 7 = Sunday' })
  @IsInt()
  @Min(1)
  @Max(7)
  dayOfWeek!: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  termId!: string;

  @ApiPropertyOptional({ example: 'Room 12' })
  @IsOptional()
  @IsString()
  room?: string;
}

export class UpdateTimetableEntryDto extends PartialType(
  CreateTimetableEntryDto,
) {}
