import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class CheckoutDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  invoiceId!: string;

  @ApiPropertyOptional({
    description:
      'Amount to pay now, in NGN — omit to pay the full outstanding balance',
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  amount?: number;
}

export class ManualPaymentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  invoiceId!: string;

  @ApiProperty({ example: 15000 })
  @IsNumber()
  @Min(1)
  amount!: number;

  @ApiProperty({ enum: PaymentMethod })
  @IsIn(['CASH', 'BANK_TRANSFER', 'POS'] satisfies PaymentMethod[])
  method!: 'CASH' | 'BANK_TRANSFER' | 'POS';

  @ApiProperty({
    description: 'Bank reference / POS slip / receipt book number',
  })
  @IsString()
  @IsNotEmpty()
  reference!: string;
}

export class InstallmentInputDto {
  @ApiProperty()
  @IsDateString()
  dueDate!: string;

  @ApiProperty({ example: 15000 })
  @IsNumber()
  @Min(0.01)
  amount!: number;
}

export class CreatePaymentPlanDto {
  @ApiProperty({ type: [InstallmentInputDto] })
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => InstallmentInputDto)
  installments!: InstallmentInputDto[];
}
