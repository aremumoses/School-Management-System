import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class CreateTermInSessionDto {
  @ApiProperty({ example: 'First' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: '2025-09-15' })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ example: '2025-12-12' })
  @IsDateString()
  endDate!: string;
}

export class CreateSessionDto {
  @ApiProperty({ example: '2026/2027' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({
    type: [CreateTermInSessionDto],
    description:
      'Optionally scaffold terms in the same request (e.g. all 3 at once) — created atomically with the session.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateTermInSessionDto)
  terms?: CreateTermInSessionDto[];
}
