import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ConductDomain } from '@prisma/client';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class ConductRatingEntryDto {
  @ApiProperty({ enum: ConductDomain })
  @IsEnum(ConductDomain)
  domain!: ConductDomain;

  @ApiProperty({ example: 'Punctuality' })
  @IsString()
  category!: string;

  @ApiProperty({ example: 4, minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  score!: number;
}

export class SubmitConductDto {
  @ApiProperty({ type: [ConductRatingEntryDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ConductRatingEntryDto)
  ratings!: ConductRatingEntryDto[];

  @ApiPropertyOptional({
    description: "The Class Teacher's comment for this student's term",
  })
  @IsOptional()
  @IsString()
  formTeacherComment?: string;
}
