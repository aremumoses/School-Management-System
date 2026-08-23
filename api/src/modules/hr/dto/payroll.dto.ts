import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateSalaryStructureDto {
  @ApiProperty({ example: 'Teacher I' })
  @IsString()
  @IsNotEmpty()
  gradeLevel!: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  basicSalary!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  housingAllowance?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  transportAllowance?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  otherAllowances?: number;
}

export class UpdateSalaryStructureDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  basicSalary?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  housingAllowance?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  transportAllowance?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  otherAllowances?: number;
}

export class PayeBandDto {
  @ApiPropertyOptional({
    nullable: true,
    description:
      'Upper bound of this band in Naira; null = no upper limit (top band).',
  })
  @IsOptional()
  @IsNumber()
  upTo!: number | null;

  @ApiProperty({
    description:
      'Percentage rate applied to the portion of income in this band.',
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  rate!: number;
}

export class UpdatePayrollConfigDto {
  @ApiProperty({ type: [PayeBandDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PayeBandDto)
  payeBands!: PayeBandDto[];

  @ApiProperty()
  @IsNumber()
  @Min(0)
  craFlatAmount!: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(100)
  craPercentOfGross!: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(100)
  craPercentAllowance!: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(100)
  pensionEmployeeRate!: number;
}

export class CreatePayrollRunDto {
  @ApiProperty({ minimum: 1, maximum: 12 })
  @IsInt()
  @Min(1)
  @Max(12)
  month!: number;

  @ApiProperty()
  @IsInt()
  year!: number;
}
