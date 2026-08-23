import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class MapSubjectToClassDto {
  @ApiProperty({
    description: 'The Class id this subject should be offered at',
  })
  @IsString()
  @IsNotEmpty()
  classId!: string;
}
