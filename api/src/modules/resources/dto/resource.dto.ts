import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';
import { ResourceType } from '@prisma/client';

export class CreateResourceDto {
  @ApiProperty({ example: 'Photosynthesis summary notes' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiPropertyOptional({ example: 'Plant nutrition' })
  @IsOptional()
  @IsString()
  topic?: string;

  @ApiProperty({ enum: ResourceType })
  @IsIn(Object.values(ResourceType))
  type!: ResourceType;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  subjectId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  classId!: string;

  @ApiPropertyOptional({
    description:
      'External link — required for VIDEO_LINK; file types upload their binary via POST /resources/:id/file instead',
    example: 'https://youtu.be/dQw4w9WgXcQ',
  })
  @IsOptional()
  @IsUrl()
  externalUrl?: string;
}

export class QueryResourcesDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  classId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subjectId?: string;

  @ApiPropertyOptional({ enum: ResourceType })
  @IsOptional()
  @IsIn(Object.values(ResourceType))
  type?: ResourceType;

  @ApiPropertyOptional({ description: 'Case-insensitive title/topic search' })
  @IsOptional()
  @IsString()
  search?: string;
}
