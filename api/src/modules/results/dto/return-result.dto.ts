import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ReturnResultDto {
  @ApiProperty({
    description: 'Why this class/term is being sent back for correction',
  })
  @IsString()
  @IsNotEmpty()
  reason!: string;
}
