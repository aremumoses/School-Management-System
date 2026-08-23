import { ApiPropertyOptional } from '@nestjs/swagger';
import { EnrollmentStatus } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class QueryStudentsDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;

  @ApiPropertyOptional({
    description: 'Filter to students with an enrollment in this class',
  })
  @IsOptional()
  @IsString()
  classId?: string;

  @ApiPropertyOptional({
    description: 'Filter to students with an enrollment in this arm',
  })
  @IsOptional()
  @IsString()
  armId?: string;

  @ApiPropertyOptional({
    description: 'Filter to students with an enrollment in this session',
  })
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiPropertyOptional({ enum: EnrollmentStatus })
  @IsOptional()
  @IsEnum(EnrollmentStatus)
  status?: EnrollmentStatus;

  @ApiPropertyOptional({
    description: 'Matches name or admission number, case-insensitive',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description:
      'Include soft-deleted (deactivated) students. Defaults to false.',
  })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  includeInactive?: boolean = false;
}
