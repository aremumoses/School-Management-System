import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  Allow,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { QuestionDifficulty, QuestionType } from '@prisma/client';

// --- Question bank ---

export class CreateQuestionDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  subjectId!: string;

  @ApiProperty({ example: 'Simple equations (NERDC JSS2 Theme 2)' })
  @IsString()
  @IsNotEmpty()
  topic!: string;

  @ApiProperty({ example: 2, description: 'Class level (1 = JSS1 … 6 = SSS3)' })
  @IsInt()
  @Min(1)
  @Max(6)
  classLevel!: number;

  @ApiProperty({ enum: QuestionDifficulty })
  @IsIn(Object.values(QuestionDifficulty))
  difficulty!: QuestionDifficulty;

  @ApiPropertyOptional({ example: 'application' })
  @IsOptional()
  @IsString()
  bloomTag?: string;

  @ApiProperty({ enum: QuestionType })
  @IsIn(Object.values(QuestionType))
  type!: QuestionType;

  @ApiProperty({ example: 'Solve for x: 2x + 3 = 11' })
  @IsString()
  @IsNotEmpty()
  prompt!: string;

  @ApiPropertyOptional({
    description: 'Shape depends on type — see Question model comment',
  })
  @IsOptional()
  options?: unknown;

  @ApiPropertyOptional({
    description: 'Shape depends on type; null/omitted for ESSAY',
  })
  @IsOptional()
  correctAnswer?: unknown;
}

export class UpdateQuestionDto extends PartialType(CreateQuestionDto) {}

export class ReviewQuestionDto {
  @ApiProperty({ enum: ['APPROVED', 'RETURNED'] })
  @IsIn(['APPROVED', 'RETURNED'])
  decision!: 'APPROVED' | 'RETURNED';

  @ApiPropertyOptional({ description: 'Required when returning' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class QueryQuestionsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subjectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  topic?: string;

  @ApiPropertyOptional({ enum: QuestionDifficulty })
  @IsOptional()
  @IsIn(Object.values(QuestionDifficulty))
  difficulty?: QuestionDifficulty;

  @ApiPropertyOptional({ enum: QuestionType })
  @IsOptional()
  @IsIn(Object.values(QuestionType))
  type?: QuestionType;

  @ApiPropertyOptional({ enum: ['PENDING', 'APPROVED', 'RETURNED'] })
  @IsOptional()
  @IsIn(['PENDING', 'APPROVED', 'RETURNED'])
  status?: 'PENDING' | 'APPROVED' | 'RETURNED';
}

// --- Test assembly ---

export class CreateCBTTestDto {
  @ApiProperty({ example: 'JSS2 Mathematics CA2 — Algebra' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  classSubjectId!: string;

  @ApiProperty({ example: 30 })
  @IsInt()
  @IsPositive()
  timeLimitMinutes!: number;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @IsPositive()
  attemptsAllowed?: number;

  @ApiProperty()
  @IsDateString()
  availableFrom!: string;

  @ApiProperty()
  @IsDateString()
  availableTo!: string;

  @ApiPropertyOptional({ default: 50 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  passMark?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  instantRelease?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  showCorrectAnswersAfter?: boolean;

  @ApiPropertyOptional({
    default: false,
    description: 'JAMB mock practice — never feeds the results engine',
  })
  @IsOptional()
  @IsBoolean()
  isMockPractice?: boolean;

  @ApiPropertyOptional({
    description:
      'Set when this test is a formal CA/exam component — the final score writes into the Score table',
  })
  @IsOptional()
  @IsString()
  assessmentComponentId?: string;
}

export class UpdateCBTTestDto extends PartialType(CreateCBTTestDto) {}

export class AddTestQuestionsDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  questionIds!: string[];

  @ApiPropertyOptional({ default: 1, description: 'Points per question' })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  points?: number;
}

export class AutoAssembleRuleDto {
  @ApiProperty({ example: 'Simple equations (NERDC JSS2 Theme 2)' })
  @IsString()
  @IsNotEmpty()
  topic!: string;

  @ApiPropertyOptional({
    enum: QuestionDifficulty,
    description: 'Omit for mixed difficulty',
  })
  @IsOptional()
  @IsIn(Object.values(QuestionDifficulty))
  difficulty?: QuestionDifficulty;

  @ApiProperty({ example: 10 })
  @IsInt()
  @IsPositive()
  count!: number;
}

export class AutoAssembleDto {
  @ApiProperty({ type: [AutoAssembleRuleDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AutoAssembleRuleDto)
  rules!: AutoAssembleRuleDto[];

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  points?: number;
}

// --- Taking a test ---

export class SaveAnswerDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  questionId!: string;

  @ApiProperty({ description: 'Shape matches the question type' })
  @Allow()
  answer!: unknown;
}

export class GradeEssayDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  questionId!: string;

  @ApiProperty({ example: 4 })
  @IsNumber()
  @Min(0)
  score!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  feedback?: string;
}
