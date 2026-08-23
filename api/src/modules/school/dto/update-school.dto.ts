import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsHexColor,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdateSchoolDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  registrationNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  motto?: string;

  @ApiPropertyOptional({
    description:
      'Brand color for printed documents only (report cards, receipts) — never the app UI. See prompts/00-DESIGN-SYSTEM.md §11.',
    example: '#1D4ED8',
  })
  @IsOptional()
  @IsHexColor()
  documentPrimaryColor?: string;

  @ApiPropertyOptional({ example: '#F59E0B' })
  @IsOptional()
  @IsHexColor()
  documentSecondaryColor?: string;

  @ApiPropertyOptional({
    description: 'Application fee in Naira — null means no fee required.',
    example: 5000,
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  applicationFeeAmount?: number;
}
