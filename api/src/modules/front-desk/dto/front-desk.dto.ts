import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { AssetDirection, FacilityIncidentType } from '@prisma/client';

export class AddPickupPersonDto {
  @ApiProperty({ example: 'Uncle Femi Adewale' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: '+2348012345678' })
  @IsString()
  @IsNotEmpty()
  phone!: string;

  @ApiProperty({ example: 'Uncle' })
  @IsString()
  @IsNotEmpty()
  relationship!: string;
}

export class CreatePickupRequestDto {
  @ApiProperty({ example: '2026-07-06T13:30:00.000Z' })
  @IsDateString()
  pickupTime!: string;

  @ApiProperty({ example: 'Dental appointment' })
  @IsString()
  @IsNotEmpty()
  reason!: string;
}

export class SignInVisitorDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  phone!: string;

  @ApiProperty({ example: 'PTA meeting with the Principal' })
  @IsString()
  @IsNotEmpty()
  reason!: string;

  @ApiPropertyOptional({ description: 'The staff member being visited' })
  @IsOptional()
  @IsString()
  hostStaffId?: string;
}

export class IssueGatePassDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  studentId!: string;

  @ApiProperty({ example: 'Uncle Femi Adewale' })
  @IsString()
  @IsNotEmpty()
  pickupPersonName!: string;

  @ApiPropertyOptional({ example: '+2348012345678' })
  @IsOptional()
  @IsString()
  pickupPersonPhone?: string;

  @ApiPropertyOptional({
    description: 'Set when converting a parent-submitted pickup request',
  })
  @IsOptional()
  @IsString()
  pickupRequestId?: string;
}

export class ResolveGatePassDto {
  @ApiProperty({ enum: ['CONFIRM', 'REJECT'] })
  @IsIn(['CONFIRM', 'REJECT'])
  decision!: 'CONFIRM' | 'REJECT';
}

export class LogLateArrivalDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  studentId!: string;

  @ApiProperty({ example: '2026-07-06T08:45:00.000Z' })
  @IsDateString()
  arrivalTime!: string;

  @ApiPropertyOptional({
    default: false,
    description:
      'Optionally notify the Class Teacher (spec: configurable, not always-on)',
  })
  @IsOptional()
  @IsBoolean()
  notifyClassTeacher?: boolean;
}

export class LogFacilityIncidentDto {
  @ApiProperty({ enum: FacilityIncidentType })
  @IsIn(Object.values(FacilityIncidentType))
  type!: FacilityIncidentType;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  partiesInvolved?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  actionTaken?: string;
}

export class LogAssetMovementDto {
  @ApiProperty({ example: 'Epson projector (asset tag PR-004)' })
  @IsString()
  @IsNotEmpty()
  assetDescription!: string;

  @ApiProperty({ enum: AssetDirection })
  @IsIn(Object.values(AssetDirection))
  direction!: AssetDirection;

  @ApiPropertyOptional({ example: 'Taken to the diocesan education fair' })
  @IsOptional()
  @IsString()
  reason?: string;
}
