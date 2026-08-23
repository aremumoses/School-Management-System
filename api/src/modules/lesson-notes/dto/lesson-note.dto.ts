import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { LessonNoteStatus } from '@prisma/client';

export class CreateLessonNoteDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  classSubjectId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  termId!: string;

  @ApiProperty({ example: 3, description: 'Week of term (1-based)' })
  @IsInt()
  @Min(1)
  @Max(20)
  weekOfTerm!: number;

  @ApiProperty({ example: 'Simultaneous Linear Equations' })
  @IsString()
  @IsNotEmpty()
  topic!: string;

  @ApiPropertyOptional({
    example: 'NERDC JSS2 Mathematics, Theme 2, Topic 4',
    description: 'Free-text reference to the NERDC scheme of work',
  })
  @IsOptional()
  @IsString()
  nerdcReference?: string;

  @ApiPropertyOptional({
    example: 'By the end of the lesson, students should be able to…',
  })
  @IsOptional()
  @IsString()
  objectives?: string;

  @ApiProperty({ description: 'The main lesson content/procedure' })
  @IsString()
  @IsNotEmpty()
  content!: string;

  @ApiPropertyOptional({ description: 'Class activities / practice' })
  @IsOptional()
  @IsString()
  activities?: string;

  @ApiPropertyOptional({ description: 'Evaluation / assignment questions' })
  @IsOptional()
  @IsString()
  evaluation?: string;
}

export class UpdateLessonNoteDto extends PartialType(CreateLessonNoteDto) {}

export class ReviewLessonNoteDto {
  @ApiProperty({ enum: ['APPROVED', 'RETURNED'] })
  @IsIn(['APPROVED', 'RETURNED'])
  decision!: 'APPROVED' | 'RETURNED';

  @ApiPropertyOptional({
    description: 'Required when returning — what needs revision',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class DuplicateLessonNoteDto {
  @ApiPropertyOptional({
    description: 'Target term — defaults to the current term',
  })
  @IsOptional()
  @IsString()
  termId?: string;

  @ApiPropertyOptional({
    description: 'Week in the target term — defaults to the source note’s week',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  weekOfTerm?: number;
}

export class QueryLessonNotesDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  classSubjectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  termId?: string;

  @ApiPropertyOptional({ enum: LessonNoteStatus })
  @IsOptional()
  @IsIn(Object.values(LessonNoteStatus))
  status?: LessonNoteStatus;
}
