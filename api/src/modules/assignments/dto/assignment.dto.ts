import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateAssignmentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  classSubjectId!: string;

  @ApiProperty({ example: 'Chapter 4 exercises' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({ example: 'Answer questions 1–10 on page 52.' })
  @IsString()
  @IsNotEmpty()
  instructions!: string;

  @ApiProperty({ example: '2026-07-12T15:00:00.000Z' })
  @IsDateString()
  dueDate!: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  allowLateSubmission?: boolean;
}

export class UpdateAssignmentDto extends PartialType(CreateAssignmentDto) {}

export class SubmitAssignmentDto {
  @ApiPropertyOptional({
    description:
      'Text response — at least one of text/file is required (the file goes up separately via the submission upload endpoint)',
  })
  @IsOptional()
  @IsString()
  textResponse?: string;
}

export class GradeSubmissionDto {
  @ApiProperty({ example: '8/10' })
  @IsString()
  @IsNotEmpty()
  grade!: string;

  @ApiPropertyOptional({ example: 'Good work — revise question 7.' })
  @IsOptional()
  @IsString()
  feedback?: string;
}

export class QueryAssignmentsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  classSubjectId?: string;

  @ApiPropertyOptional({ description: 'PARENT callers: filter to one ward' })
  @IsOptional()
  @IsString()
  studentId?: string;
}
