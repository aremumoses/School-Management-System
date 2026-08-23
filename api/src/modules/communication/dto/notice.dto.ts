import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateNoticeDto {
  @ApiProperty({ example: 'PTA meeting — Saturday 14th' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({
    example: 'The termly PTA meeting holds in the school hall at 10am.',
  })
  @IsString()
  @IsNotEmpty()
  body!: string;

  @ApiProperty({ example: 'Event' })
  @IsString()
  @IsNotEmpty()
  category!: string;
}

export class UpdateNoticeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  body?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  category?: string;
}

export class QueryNoticesDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;
}
