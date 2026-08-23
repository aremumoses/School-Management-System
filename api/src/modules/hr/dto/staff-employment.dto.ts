import { ApiPropertyOptional } from '@nestjs/swagger';
import { StaffDocumentType } from '@prisma/client';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';

export class UpsertEmploymentRecordDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nextOfKinName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nextOfKinPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nextOfKinRelationship?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  qualifications?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  department?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bankName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bankAccountNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bankAccountName?: string;

  @ApiPropertyOptional({
    description:
      'Grade level this staff member is paid against — must reference an existing SalaryStructure.',
  })
  @IsOptional()
  @IsString()
  salaryStructureId?: string;
}

export class UploadStaffDocumentDto {
  @ApiPropertyOptional({ enum: StaffDocumentType })
  @IsEnum(StaffDocumentType)
  type!: StaffDocumentType;

  @ApiPropertyOptional({
    description:
      'Only meaningful for CONTRACT (and occasionally ID) — drives the nearing-expiry alert.',
  })
  @IsOptional()
  @IsDateString()
  expiryDate?: string;
}
