import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DisciplinaryActionType, IncidentSeverity } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateIncidentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  studentId!: string;

  @ApiProperty({ example: 'Disrupted class repeatedly after two warnings.' })
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiProperty({ enum: IncidentSeverity })
  @IsEnum(IncidentSeverity)
  severity!: IncidentSeverity;

  @ApiProperty({
    description: 'When the incident occurred (not when it was logged)',
  })
  @IsDateString()
  date!: string;
}

export class UpdateIncidentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  description?: string;

  @ApiPropertyOptional({ enum: IncidentSeverity })
  @IsOptional()
  @IsEnum(IncidentSeverity)
  severity?: IncidentSeverity;
}

export class QueryIncidentsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  studentId?: string;
}

export class ProposeActionDto {
  @ApiProperty({ enum: DisciplinaryActionType })
  @IsEnum(DisciplinaryActionType)
  actionType!: DisciplinaryActionType;
}

export class ApproveActionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  decisionNotes?: string;
}

export class RejectActionDto {
  @ApiProperty({ description: 'Why this proposed action is being declined' })
  @IsString()
  @IsNotEmpty()
  decisionNotes!: string;
}
