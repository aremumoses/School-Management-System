import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateTeacherAssignmentDto {
  @ApiProperty({
    description: 'The ClassSubject id (a subject mapped to a class level)',
  })
  @IsString()
  @IsNotEmpty()
  classSubjectId!: string;

  @ApiProperty({ description: 'The Term this assignment applies to' })
  @IsString()
  @IsNotEmpty()
  termId!: string;

  @ApiPropertyOptional({
    description:
      'Score-entry deadline for this class/subject/term — omit for no enforced deadline',
  })
  @IsOptional()
  @IsDateString()
  scoreEntryDeadline?: string;
}
