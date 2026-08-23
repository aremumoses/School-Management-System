import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateAssessmentComponentDto {
  @ApiProperty({ description: 'The term this component applies to' })
  @IsString()
  @IsNotEmpty()
  termId!: string;

  @ApiPropertyOptional({
    description:
      'Restrict this component to one subject. Omit to define the school-wide default for the term — a subject with no overrides of its own falls back to these.',
  })
  @IsOptional()
  @IsString()
  subjectId?: string;

  @ApiProperty({ example: 'CA1' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 10 })
  @IsNumber()
  @Min(0.01)
  maxScore!: number;

  @ApiProperty({
    example: 10,
    description: "Contribution to the subject's overall score, out of 100",
  })
  @IsNumber()
  @Min(0)
  weight!: number;
}

export class UpdateAssessmentComponentDto {
  @ApiPropertyOptional({ example: 'CA1' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  maxScore?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  weight?: number;
}

export class QueryAssessmentComponentsDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  termId!: string;

  @ApiPropertyOptional({
    description:
      'If given, returns the effective (resolved) component set for this subject — its own overrides if it has any, else the term default.',
  })
  @IsOptional()
  @IsString()
  subjectId?: string;
}
