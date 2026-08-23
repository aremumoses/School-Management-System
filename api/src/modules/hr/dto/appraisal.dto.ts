import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class RatedCategoryDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  key!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  label!: string;

  @ApiProperty({
    description: 'Top of the rating scale — the bottom is always 1.',
  })
  @IsInt()
  @Min(2)
  @Max(10)
  maxScore!: number;
}

export class FreeTextSectionDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  key!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  label!: string;
}

export class UpsertAppraisalFormDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ type: [RatedCategoryDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RatedCategoryDto)
  ratedCategories!: RatedCategoryDto[];

  @ApiProperty({ type: [FreeTextSectionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FreeTextSectionDto)
  freeTextSections!: FreeTextSectionDto[];
}

export class CreateAppraisalCycleDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty()
  @IsDateString()
  periodStart!: string;

  @ApiProperty()
  @IsDateString()
  periodEnd!: string;

  @ApiPropertyOptional({
    description: 'Uses the current appraisal form definition if omitted.',
  })
  @IsOptional()
  @IsString()
  formId?: string;
}

export class UpdateAppraisalCycleStatusDto {
  @ApiProperty({ enum: ['DRAFT', 'ACTIVE', 'CLOSED'] })
  @IsIn(['DRAFT', 'ACTIVE', 'CLOSED'])
  status!: 'DRAFT' | 'ACTIVE' | 'CLOSED';
}

export class CreateAppraisalSubmissionDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  staffId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  reviewerId!: string;
}

export class SaveAppraisalResponsesDto {
  @ApiProperty({ description: '{ [categoryKey]: number }' })
  @IsObject()
  ratings!: Record<string, number>;

  @ApiProperty({ description: '{ [sectionKey]: string }' })
  @IsObject()
  freeText!: Record<string, string>;

  @ApiPropertyOptional({
    description:
      'Set true to move this from DRAFT to SUBMITTED. Omit to save a partial draft.',
  })
  @IsOptional()
  submit?: boolean;
}

export class SignOffAppraisalDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}
