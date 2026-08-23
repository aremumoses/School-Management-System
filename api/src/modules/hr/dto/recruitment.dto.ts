import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CandidateStage, Role, VacancyStatus } from '@prisma/client';
import {
  IsArray,
  IsDateString,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateVacancyDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  title!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  closesAt?: string;
}

export class UpdateVacancyStatusDto {
  @ApiProperty({ enum: VacancyStatus })
  @IsEnum(VacancyStatus)
  status!: VacancyStatus;
}

// Public, unauthenticated — same reasoning as Stage 12's ApplyDto: a
// candidate has no account yet. JSON-only (no file upload) mirroring that
// endpoint's shape; resumeUrl is a link the candidate pastes rather than a
// public multipart upload.
export class ApplyToVacancyDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name!: string;

  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsPhoneNumber()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  resumeUrl?: string;
}

export class UpdateCandidateStageDto {
  @ApiProperty({ enum: CandidateStage })
  @IsEnum(CandidateStage)
  stage!: CandidateStage;
}

export class ConvertCandidateDto {
  @ApiProperty({ enum: Role, isArray: true })
  @IsArray()
  @IsEnum(Role, { each: true })
  roles!: Role[];
}
