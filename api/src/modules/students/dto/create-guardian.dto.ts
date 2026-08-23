import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateGuardianDto {
  @ApiProperty({ example: 'Funke' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName!: string;

  @ApiProperty({ example: 'Bello' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName!: string;

  @ApiProperty({ example: 'funke.bello@example.com' })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({ example: '+2348012345678' })
  @IsOptional()
  @IsPhoneNumber()
  phone?: string;

  @ApiPropertyOptional({
    description:
      'If omitted, a temporary password is generated and returned once in the response.',
  })
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;
}
