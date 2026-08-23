import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
} from 'class-validator';

const BORROWER_TYPES = ['STUDENT', 'STAFF'] as const;

// --- Catalog ---

export class CreateBookDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  author!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  isbn?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  category!: string;

  @ApiProperty({ example: 3 })
  @IsInt()
  @IsPositive()
  totalCopies!: number;

  @ApiPropertyOptional({ example: 'Fiction Shelf 4B' })
  @IsOptional()
  @IsString()
  shelfLocation?: string;
}

export class UpdateBookDto extends PartialType(CreateBookDto) {}

// --- Circulation ---

export class CreateLoanDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  bookId!: string;

  @ApiProperty({ enum: BORROWER_TYPES })
  @IsIn(BORROWER_TYPES)
  borrowerType!: (typeof BORROWER_TYPES)[number];

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  borrowerId!: string;
}

// --- Reservations ---

export class CreateReservationDto {
  @ApiProperty({ enum: BORROWER_TYPES })
  @IsIn(BORROWER_TYPES)
  borrowerType!: (typeof BORROWER_TYPES)[number];

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  borrowerId!: string;
}

// --- Fine settlement ---

export class SettleFineWithInvoiceDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  termId!: string;
}

// --- Library loan policy settings (School.libraryLoanPolicy JSON) ---

export class UpdateLibraryPolicyDto {
  @ApiProperty({ example: 14 })
  @IsInt()
  @IsPositive()
  studentLoanDays!: number;

  @ApiProperty({ example: 30 })
  @IsInt()
  @IsPositive()
  staffLoanDays!: number;

  @ApiProperty({ example: 2 })
  @IsInt()
  @IsPositive()
  studentBorrowLimit!: number;

  @ApiProperty({ example: 5 })
  @IsInt()
  @IsPositive()
  staffBorrowLimit!: number;

  @ApiProperty({ example: 50 })
  @IsNumber()
  @Min(0)
  finePerDay!: number;
}
