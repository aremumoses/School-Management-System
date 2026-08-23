import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class ScoreEntryDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  studentId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  assessmentComponentId!: string;

  @ApiProperty({ example: 8 })
  @IsNumber()
  @Min(0)
  score!: number;
}

export class SubmitScoresDto {
  @ApiProperty({ description: 'The ClassSubject these scores are for' })
  @IsString()
  @IsNotEmpty()
  classSubjectId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  termId!: string;

  @ApiProperty({
    type: [ScoreEntryDto],
    description:
      'One entry per student per assessment component. Can be a partial set (e.g. just one component) — only the listed (student, component) pairs are touched.',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ScoreEntryDto)
  entries!: ScoreEntryDto[];
}
