import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AttendanceStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class AttendanceEntryDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  studentId!: string;

  @ApiProperty({ enum: AttendanceStatus })
  @IsEnum(AttendanceStatus)
  status!: AttendanceStatus;
}

export class MarkAttendanceDto {
  @ApiProperty({ description: 'The arm being marked' })
  @IsString()
  @IsNotEmpty()
  armId!: string;

  @ApiPropertyOptional({
    description:
      'Set this to mark a single period (Subject Teacher). Omit to mark whole-day attendance (Class Teacher).',
  })
  @IsOptional()
  @IsString()
  classSubjectId?: string;

  @ApiProperty({ example: '2026-05-04' })
  @IsDateString()
  date!: string;

  @ApiPropertyOptional({
    type: [AttendanceEntryDto],
    description:
      'Per-student status. Omit (or send an empty array) to mark every actively-enrolled student PRESENT in one call — the realistic "mark all present, then adjust exceptions" workflow: call once with no entries, then call again with just the exceptions to override them.',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttendanceEntryDto)
  entries?: AttendanceEntryDto[];
}
