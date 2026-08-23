import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateConversationDto {
  @ApiPropertyOptional({
    description:
      'STAFF callers: the guardian to start a thread with (required for staff).',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  guardianId?: string;

  @ApiPropertyOptional({
    description:
      'STUDENT callers: the teacher to start a thread with (required for students; must be one of their own subject/class teachers).',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  staffId?: string;

  @ApiPropertyOptional({
    description:
      'Which student this thread concerns. Required for staff callers; ignored for STUDENT callers (always themselves).',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  studentId?: string;

  @ApiProperty({ example: "Just checking in on Tayo's recent absences." })
  @IsString()
  @IsNotEmpty()
  message!: string;
}

export class CreateMessageDto {
  @ApiProperty({ example: 'Thank you, he was unwell — back tomorrow.' })
  @IsString()
  @IsNotEmpty()
  body!: string;
}
