import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

// --- Exam sessions & halls ---

export class CreateExamSessionDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  subjectId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  armId!: string;

  @ApiProperty({ example: '2026-08-10' })
  @IsISO8601()
  date!: string;

  @ApiProperty({ example: '09:00', description: '24h HH:MM' })
  @Matches(TIME_PATTERN, { message: 'startTime must be HH:MM (24h)' })
  startTime!: string;

  @ApiProperty({ example: 90 })
  @IsInt()
  @IsPositive()
  durationMinutes!: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  termId!: string;
}

export class UpdateExamSessionDto extends PartialType(CreateExamSessionDto) {}

export class CreateExamHallDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 40 })
  @IsInt()
  @IsPositive()
  capacity!: number;
}

export class UpdateExamHallDto extends PartialType(CreateExamHallDto) {}

export class AllocateSeatsDto {
  @ApiProperty({ type: [String], description: 'Hall ids to fill, in order' })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  hallIds!: string[];
}

export class ManualSeatAllocationDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  studentId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  hallId!: string;

  @ApiProperty()
  @IsInt()
  @IsPositive()
  seatNumber!: number;
}

// --- Invigilation ---

export class AssignInvigilatorDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  staffId!: string;

  @ApiProperty({ enum: ['LEAD', 'ASSISTANT'] })
  @IsIn(['LEAD', 'ASSISTANT'])
  role!: 'LEAD' | 'ASSISTANT';
}

// --- External exam candidates ---

const EXAM_BODIES = ['BECE', 'WAEC', 'NECO', 'NABTEB', 'JAMB'] as const;

export class CreateExternalExamCandidateDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  studentId!: string;

  @ApiProperty({ enum: EXAM_BODIES })
  @IsIn(EXAM_BODIES)
  examBody!: (typeof EXAM_BODIES)[number];

  @ApiProperty({ example: 2026 })
  @IsInt()
  @Min(2000)
  @Max(2100)
  sessionYear!: number;

  @ApiProperty({
    type: [String],
    example: ['Mathematics', 'Physics', 'Chemistry', 'Biology'],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  subjectCombination!: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  registrationNumber?: string;
}

export class UpdateExternalExamCandidateDto {
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  subjectCombination?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  registrationNumber?: string;

  @ApiPropertyOptional({ enum: ['PENDING', 'REGISTERED', 'WITHDRAWN'] })
  @IsOptional()
  @IsIn(['PENDING', 'REGISTERED', 'WITHDRAWN'])
  status?: 'PENDING' | 'REGISTERED' | 'WITHDRAWN';
}

// --- Malpractice log ---

export class CreateMalpracticeIncidentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  examSessionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cbtAttemptId?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  studentId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  actionTaken!: string;
}
