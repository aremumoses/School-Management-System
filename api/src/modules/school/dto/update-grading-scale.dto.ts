import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GradingScaleEntryDto {
  @ApiProperty({ example: 75 })
  @IsInt()
  @Min(0)
  @Max(100)
  min!: number;

  @ApiProperty({ example: 100 })
  @IsInt()
  @Min(0)
  @Max(100)
  max!: number;

  @ApiProperty({ example: 'A1' })
  @IsString()
  @IsNotEmpty()
  grade!: string;

  @ApiProperty({ example: 'Excellent' })
  @IsString()
  @IsNotEmpty()
  remark!: string;
}

export class CaWeightingEntryDto {
  @ApiProperty({ example: 'CA1' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 10 })
  @IsNumber()
  @Min(0)
  @Max(100)
  weight!: number;
}

export class UpdateGradingScaleDto {
  @ApiProperty({ type: [GradingScaleEntryDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => GradingScaleEntryDto)
  gradingScale!: GradingScaleEntryDto[];

  @ApiProperty({
    type: [CaWeightingEntryDto],
    description:
      'Weights must sum to 100 — see docs/14-module-academic-results.md §2.',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CaWeightingEntryDto)
  caWeighting!: CaWeightingEntryDto[];
}
