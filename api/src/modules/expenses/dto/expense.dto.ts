import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MinLength,
} from 'class-validator';
import { ExpenseCategory } from '@prisma/client';

export class CreateExpenseDto {
  @ApiProperty({ enum: ExpenseCategory })
  @IsEnum(ExpenseCategory)
  category!: ExpenseCategory;

  @ApiProperty({ example: 45000 })
  @IsNumber()
  @IsPositive()
  amount!: number;

  @ApiProperty({ example: '2026-07-01' })
  @IsDateString()
  date!: string;

  @ApiProperty({ example: 'Generator fuel — July' })
  @IsString()
  @MinLength(3)
  description!: string;
}

export class UpdateExpenseDto extends PartialType(CreateExpenseDto) {}

export class QueryExpensesDto {
  @ApiPropertyOptional({ description: 'ISO date — inclusive lower bound' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'ISO date — inclusive upper bound' })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({ enum: ExpenseCategory })
  @IsOptional()
  @IsEnum(ExpenseCategory)
  category?: ExpenseCategory;
}
