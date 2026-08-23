import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EnrollmentStatus } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateEnrollmentDto {
  @ApiProperty({ description: 'Class id to enroll the student into' })
  @IsString()
  @IsNotEmpty()
  classId!: string;

  @ApiProperty({
    description: 'Arm id (must belong to classId) to enroll the student into',
  })
  @IsString()
  @IsNotEmpty()
  armId!: string;

  @ApiProperty({ description: 'Term this enrollment applies to' })
  @IsString()
  @IsNotEmpty()
  termId!: string;

  @ApiPropertyOptional({
    enum: EnrollmentStatus,
    default: EnrollmentStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(EnrollmentStatus)
  status?: EnrollmentStatus;
}
