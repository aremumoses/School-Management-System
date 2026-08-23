import { ApiProperty } from '@nestjs/swagger';
import { EnrollmentStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateEnrollmentDto {
  @ApiProperty({
    enum: EnrollmentStatus,
    description:
      'Transition this enrollment to a terminal/updated status (e.g. PROMOTED, WITHDRAWN). To move a student to a new term, update the old enrollment away from ACTIVE first, then create the new enrollment.',
  })
  @IsEnum(EnrollmentStatus)
  status!: EnrollmentStatus;
}
