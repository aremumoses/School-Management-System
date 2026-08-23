import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  IsString,
  MaxLength,
} from 'class-validator';

/**
 * Either supply `guardianId` to link an already-existing guardian (the
 * common case for a sibling's second/third child), or omit it and supply
 * firstName/lastName/email to create a brand-new guardian and link them in
 * one step — see students.service.ts's linkGuardian for which path runs.
 */
export class LinkGuardianDto {
  @ApiPropertyOptional({ description: 'Link an existing guardian by id' })
  @IsOptional()
  @IsString()
  guardianId?: string;

  @ApiPropertyOptional({
    description: 'Required when creating a new guardian (no guardianId)',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName?: string;

  @ApiPropertyOptional({
    description: 'Required when creating a new guardian (no guardianId)',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName?: string;

  @ApiPropertyOptional({
    description: 'Required when creating a new guardian (no guardianId)',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsPhoneNumber()
  phone?: string;

  @ApiProperty({ example: 'Mother' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  relationship!: string;
}
