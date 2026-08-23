import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class ValidBookImportRowDto {
  @ApiProperty()
  @IsInt()
  @Min(1)
  rowNumber!: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  author!: string;

  @ApiProperty({ nullable: true })
  @IsOptional()
  @IsString()
  isbn!: string | null;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  category!: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  totalCopies!: number;

  @ApiProperty({ nullable: true })
  @IsOptional()
  @IsString()
  shelfLocation!: string | null;
}

export class BulkImportCommitDto {
  @ApiProperty({ type: [ValidBookImportRowDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ValidBookImportRowDto)
  rows!: ValidBookImportRowDto[];
}
