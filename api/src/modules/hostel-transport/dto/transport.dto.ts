import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  ValidateNested,
} from 'class-validator';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

// --- Routes & stops ---

export class CreateRouteDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  busIdentifier!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  driverId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  conductorId?: string;
}

export class UpdateRouteDto extends PartialType(CreateRouteDto) {}

export class CreateRouteStopDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  stopName!: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @IsPositive()
  order!: number;

  @ApiPropertyOptional({ example: '07:15', description: '24h HH:MM' })
  @IsOptional()
  @Matches(TIME_PATTERN, { message: 'approximateTime must be HH:MM (24h)' })
  approximateTime?: string;
}

export class UpdateRouteStopDto extends PartialType(CreateRouteStopDto) {}

// --- Student-route assignment ---

export class CreateRouteAssignmentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  studentId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  routeId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  stopId!: string;
}

// --- Driver / conductor records ---

export class CreateTransportStaffRecordDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ enum: ['DRIVER', 'CONDUCTOR'] })
  @IsIn(['DRIVER', 'CONDUCTOR'])
  role!: 'DRIVER' | 'CONDUCTOR';

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  phone!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  licenseNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  licenseExpiryDate?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  verified?: boolean;
}

export class UpdateTransportStaffRecordDto extends PartialType(
  CreateTransportStaffRecordDto,
) {}

// --- Pickup/drop attendance ---

export class TransportAttendanceEntryDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  studentId!: string;

  @ApiProperty()
  @IsBoolean()
  boarded!: boolean;
}

export class MarkTransportAttendanceDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  routeId!: string;

  @ApiProperty({ example: '2026-07-06' })
  @IsDateString()
  date!: string;

  @ApiProperty({ enum: ['PICKUP', 'DROPOFF'] })
  @IsIn(['PICKUP', 'DROPOFF'])
  run!: 'PICKUP' | 'DROPOFF';

  @ApiPropertyOptional({
    type: [TransportAttendanceEntryDto],
    description: 'Omit/empty to mark every assigned student boarded',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TransportAttendanceEntryDto)
  entries?: TransportAttendanceEntryDto[];
}

// --- Vehicle maintenance ---

export class CreateVehicleMaintenanceDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  busIdentifier!: string;

  @ApiProperty()
  @IsDateString()
  serviceDate!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiProperty({ example: 25000 })
  @IsNumber()
  @IsPositive()
  cost!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  nextServiceDueDate?: string;
}
