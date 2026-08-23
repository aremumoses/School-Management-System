import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class UnlockScoresDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  classSubjectId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  termId!: string;

  @ApiProperty({
    description:
      'Why this previously-locked submission is being reopened — written to the audit log',
  })
  @IsString()
  @IsNotEmpty()
  reason!: string;
}
