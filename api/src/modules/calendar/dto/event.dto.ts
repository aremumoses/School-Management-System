import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EventRsvpResponse } from '@prisma/client';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateEventDto {
  @ApiProperty({ example: 'PTA Meeting — First Term' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'PTA Meeting' })
  @IsString()
  @IsNotEmpty()
  category!: string;

  @ApiProperty()
  @IsDateString()
  startDate!: string;

  @ApiPropertyOptional({ description: 'Omit for a single-point-in-time event' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  rsvpEnabled?: boolean;
}

export class UpdateEventDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  rsvpEnabled?: boolean;
}

export class QueryEventsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;
}

export class QueryCalendarDto {
  @ApiProperty()
  @IsDateString()
  from!: string;

  @ApiProperty()
  @IsDateString()
  to!: string;
}

export class RsvpDto {
  @ApiProperty({ enum: EventRsvpResponse })
  @IsEnum(EventRsvpResponse)
  response!: EventRsvpResponse;
}
