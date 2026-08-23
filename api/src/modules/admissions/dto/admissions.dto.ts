import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApplicantStatus } from '@prisma/client';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class ApplyDto {
  @ApiProperty({ example: 'Emeka' })
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @ApiProperty({ example: 'Okafor' })
  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @ApiProperty({ example: '2010-06-15' })
  @IsDateString()
  dateOfBirth!: string;

  @ApiProperty({ example: 'MALE' })
  @IsString()
  @IsNotEmpty()
  gender!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({
    example: 'JSS1',
    description: 'Class level being applied for',
  })
  @IsString()
  @IsNotEmpty()
  intendedClassLevel!: string;

  @ApiProperty({ example: 'Chukwu' })
  @IsString()
  @IsNotEmpty()
  guardianFirstName!: string;

  @ApiProperty({ example: 'Okafor' })
  @IsString()
  @IsNotEmpty()
  guardianLastName!: string;

  @ApiProperty({ example: 'chukwu.okafor@example.com' })
  @IsEmail()
  guardianEmail!: string;

  @ApiProperty({ example: '+2348012345678' })
  @IsString()
  @IsNotEmpty()
  guardianPhone!: string;
}

export class ReviewApplicantDto {
  @ApiProperty({ enum: ['UNDER_REVIEW', 'APPROVED', 'REJECTED'] })
  @IsEnum(['UNDER_REVIEW', 'APPROVED', 'REJECTED'])
  decision!: 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED';

  @ApiPropertyOptional({
    description: 'Required when decision is REJECTED.',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  reviewerNotes?: string;
}

export class ConvertApplicantDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  classId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  armId!: string;

  @ApiPropertyOptional({ description: 'Auto-generated if not supplied.' })
  @IsOptional()
  @IsString()
  admissionNumber?: string;
}

export class QueryApplicantsDto {
  @ApiPropertyOptional({ enum: ApplicantStatus })
  @IsOptional()
  @IsEnum(ApplicantStatus)
  status?: ApplicantStatus;
}
