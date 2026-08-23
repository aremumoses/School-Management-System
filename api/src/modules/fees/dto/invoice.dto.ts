import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DiscountType, InvoiceStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

export class GenerateInvoicesDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  classId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  termId!: string;

  @ApiPropertyOptional({
    description:
      'When the full balance falls due — omit for no enforced due date',
  })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({
    description:
      'Preview only — computes how many students would be invoiced and for how much, without creating anything. Used for a confirm-before-committing step.',
  })
  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;
}

export class InvoiceItemInputDto {
  @ApiPropertyOptional({
    description:
      'Reference an existing FeeComponent (e.g. the Transport conditional fee a student just opted into) — its name/amount are snapshotted. Omit to bill a free-form ad-hoc item instead.',
  })
  @IsOptional()
  @IsString()
  feeComponentId?: string;

  @ApiPropertyOptional({ example: 'Mid-term Sports Levy' })
  @ValidateIf((dto: InvoiceItemInputDto) => !dto.feeComponentId)
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional({ example: 5000 })
  @ValidateIf((dto: InvoiceItemInputDto) => !dto.feeComponentId)
  @IsNumber()
  @Min(0.01)
  amount?: number;
}

export class CreateIndividualInvoiceDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  termId!: string;

  @ApiPropertyOptional({ example: 'Mid-term Sports Levy' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiProperty({ type: [InvoiceItemInputDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => InvoiceItemInputDto)
  items!: InvoiceItemInputDto[];
}

export class AddDiscountDto {
  @ApiProperty({ enum: DiscountType })
  @IsEnum(DiscountType)
  type!: DiscountType;

  @ApiProperty({
    example: 10,
    description:
      'Percentage (0-100) if type is PERCENTAGE, otherwise a flat NGN amount',
  })
  @IsNumber()
  @Min(0.01)
  value!: number;

  @ApiProperty({ example: 'Sibling discount — 2nd child' })
  @IsString()
  @IsNotEmpty()
  reason!: string;
}

export class QueryInvoicesDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  studentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  termId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  classId?: string;

  @ApiPropertyOptional({ enum: InvoiceStatus })
  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;
}

export class QueryDefaultersDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  classId?: string;

  @ApiPropertyOptional({ description: 'Minimum outstanding balance, in NGN' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  minOwed?: number;

  @ApiPropertyOptional({
    description: 'Minimum days past the invoice due date',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  minDaysOverdue?: number;
}
