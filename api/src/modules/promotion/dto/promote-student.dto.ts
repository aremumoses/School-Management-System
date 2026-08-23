import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EnrollmentStatus } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class PromoteStudentDto {
  @ApiProperty({ description: 'The enrollment being closed out' })
  @IsString()
  @IsNotEmpty()
  currentEnrollmentId!: string;

  @ApiProperty({
    enum: EnrollmentStatus,
    description:
      'The confirmed outcome for this student — never inferred/auto-applied',
  })
  @IsEnum(EnrollmentStatus)
  outcome!: EnrollmentStatus;

  @ApiPropertyOptional({
    description:
      'Required when outcome is PROMOTED or REPEATED — the class to enroll the student into next',
  })
  @IsOptional()
  @IsString()
  nextClassId?: string;

  @ApiPropertyOptional({
    description:
      'Required when outcome is PROMOTED or REPEATED — the arm to enroll the student into next',
  })
  @IsOptional()
  @IsString()
  nextArmId?: string;

  @ApiPropertyOptional({
    description:
      'Required when outcome is PROMOTED or REPEATED — the term the new enrollment starts in',
  })
  @IsOptional()
  @IsString()
  nextTermId?: string;
}
