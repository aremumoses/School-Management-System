import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsString } from 'class-validator';

export class CreateTermDto {
  @ApiProperty({ example: 'Third' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: '2026-04-20' })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ example: '2026-07-24' })
  @IsDateString()
  endDate!: string;
}
