import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  ValidateNested,
} from 'class-validator';

// --- Hostel / Room / Bed ---

export class CreateHostelDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  wardenStaffId?: string;
}

export class UpdateHostelDto extends PartialType(CreateHostelDto) {}

export class CreateRoomDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  hostelId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  roomNumber!: string;

  @ApiProperty({ example: 4 })
  @IsInt()
  @IsPositive()
  bedCapacity!: number;
}

export class UpdateRoomDto extends PartialType(CreateRoomDto) {}

export class AllocateBedDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  studentId!: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @IsPositive()
  bedNumber!: number;
}

// --- Roll-call ---

export class RollCallEntryDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  studentId!: string;

  @ApiProperty()
  @IsBoolean()
  present!: boolean;
}

export class MarkRollCallDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  hostelId!: string;

  @ApiProperty({ example: '2026-07-06' })
  @IsDateString()
  date!: string;

  @ApiProperty({ enum: ['MORNING', 'EVENING'] })
  @IsIn(['MORNING', 'EVENING'])
  session!: 'MORNING' | 'EVENING';

  @ApiPropertyOptional({
    type: [RollCallEntryDto],
    description: 'Omit/empty to mark every boarder present',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RollCallEntryDto)
  entries?: RollCallEntryDto[];
}

// --- Visitation ---

export class LogVisitationDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  studentId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  visitorName!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  relationship!: string;

  @ApiProperty()
  @IsDateString()
  visitedAt!: string;
}

// --- Inventory ---

export class CreateInventoryItemDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  roomId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  studentId?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiProperty({ enum: ['GOOD', 'FAIR', 'DAMAGED', 'LOST'] })
  @IsIn(['GOOD', 'FAIR', 'DAMAGED', 'LOST'])
  condition!: 'GOOD' | 'FAIR' | 'DAMAGED' | 'LOST';
}

export class UpdateInventoryItemDto extends PartialType(
  CreateInventoryItemDto,
) {}

// --- Boarder health log ---

export class CreateHealthLogDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  studentId!: string;

  @ApiProperty()
  @IsDateString()
  occurredAt!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  actionTaken!: string;
}

// --- Leave / outing requests ---

export class CreateLeaveRequestDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  studentId!: string;

  @ApiProperty()
  @IsDateString()
  fromDate!: string;

  @ApiProperty()
  @IsDateString()
  toDate!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  reason!: string;
}

export class DecideLeaveRequestDto {
  @ApiProperty({ enum: ['APPROVED', 'REJECTED'] })
  @IsIn(['APPROVED', 'REJECTED'])
  decision!: 'APPROVED' | 'REJECTED';

  @ApiPropertyOptional({ description: 'Required when rejecting' })
  @IsOptional()
  @IsString()
  notes?: string;
}
