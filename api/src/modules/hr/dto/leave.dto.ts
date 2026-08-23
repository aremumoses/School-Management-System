import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateLeaveTypeDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  defaultAnnualDays!: number;
}

export class UpdateLeaveTypeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  defaultAnnualDays?: number;
}

export class UpsertLeaveBalanceDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  staffId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  leaveTypeId!: string;

  @ApiProperty()
  @IsInt()
  year!: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  allocatedDays!: number;
}

// Named Hr*-prefixed to avoid a Swagger schema-name collision — Stage 25's
// hostel-transport module already has its own CreateLeaveRequestDto/
// DecideLeaveRequestDto (boarder leave/outing, a different domain, same
// obvious class name). NestJS Swagger keys components.schemas by class
// name, so two same-named classes would silently clobber each other in the
// generated OpenAPI spec.
export class CreateHrLeaveRequestDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  leaveTypeId!: string;

  @ApiProperty({ example: '2026-08-01' })
  @IsDateString()
  fromDate!: string;

  @ApiProperty({ example: '2026-08-05' })
  @IsDateString()
  toDate!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  reason!: string;
}

export class DecideHrLeaveRequestDto {
  @ApiProperty({ enum: ['APPROVED', 'REJECTED'] })
  @IsIn(['APPROVED', 'REJECTED'])
  decision!: 'APPROVED' | 'REJECTED';

  @ApiPropertyOptional({ description: 'Required when rejecting.' })
  @IsOptional()
  @IsString()
  decisionNotes?: string;
}
