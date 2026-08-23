import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class QueryScoresDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  classSubjectId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  termId!: string;
}
