import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { ConsentFormType, ConsentResponseValue } from '@prisma/client';

export class CreateConsentFormDto {
  @ApiProperty({ example: 'Excursion to the National Museum' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({
    example:
      'JSS2 Gold visits the National Museum on 20 July. Transport by school bus; lunch provided.',
  })
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiProperty({ enum: ConsentFormType })
  @IsIn(Object.values(ConsentFormType))
  type!: ConsentFormType;

  @ApiPropertyOptional({
    description:
      'Target one arm (the broadcast CLASS shape). Omit for whole-school.',
  })
  @IsOptional()
  @IsString()
  targetArmId?: string;
}

export class RespondConsentFormDto {
  @ApiProperty({ description: 'Which of your wards this response is for' })
  @IsString()
  @IsNotEmpty()
  studentId!: string;

  @ApiProperty({ enum: ConsentResponseValue })
  @IsIn(Object.values(ConsentResponseValue))
  response!: ConsentResponseValue;

  @ApiProperty({
    description:
      'Typed full name — the e-signature (name + timestamp convention)',
    example: 'Ngozi Okafor',
  })
  @IsString()
  @MinLength(3)
  signatureName!: string;
}
