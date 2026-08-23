import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FeeComponentType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class FeeComponentInputDto {
  @ApiProperty({ example: 'Tuition' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 45000 })
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @ApiProperty({ enum: FeeComponentType })
  @IsEnum(FeeComponentType)
  type!: FeeComponentType;
}

export class CreateFeeStructureDto {
  @ApiProperty({ description: 'The class (level) this structure applies to' })
  @IsString()
  @IsNotEmpty()
  classId!: string;

  @ApiProperty({ description: 'The term this structure applies to' })
  @IsString()
  @IsNotEmpty()
  termId!: string;

  @ApiProperty({ type: [FeeComponentInputDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => FeeComponentInputDto)
  components!: FeeComponentInputDto[];
}

export class AddFeeComponentDto extends FeeComponentInputDto {}

export class UpdateFeeComponentDto {
  @ApiPropertyOptional({ example: 'Tuition' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional({ example: 45000 })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  amount?: number;

  @ApiPropertyOptional({ enum: FeeComponentType })
  @IsOptional()
  @IsEnum(FeeComponentType)
  type?: FeeComponentType;
}

export class QueryFeeStructuresDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  classId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  termId?: string;
}
