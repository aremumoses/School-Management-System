import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class CreateClassDto {
  @ApiProperty({ example: 'JSS1' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 1, description: 'Ordering, e.g. JSS1=1 ... SSS3=6' })
  @IsInt()
  @Min(1)
  level!: number;
}
