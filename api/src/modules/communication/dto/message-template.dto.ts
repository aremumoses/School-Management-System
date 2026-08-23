import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateMessageTemplateDto {
  @ApiProperty({ example: 'Mid-term break notice' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 'School closes for mid-term break on {{due_date}}.' })
  @IsString()
  @IsNotEmpty()
  body!: string;
}

export class UpdateMessageTemplateDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  body?: string;
}
