import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { Gender } from '@prisma/client';
import {
  IsArray,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class ValidStudentImportRowDto {
  @ApiProperty()
  @IsInt()
  @Min(1)
  rowNumber!: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  dateOfBirth!: string;

  @ApiProperty({ enum: Gender })
  @IsEnum(Gender)
  gender!: Gender;

  @ApiProperty({ nullable: true })
  @IsOptional()
  @IsString()
  stateOfOrigin!: string | null;

  @ApiProperty({ nullable: true })
  @IsOptional()
  @IsString()
  lga!: string | null;

  @ApiProperty({ nullable: true })
  @IsOptional()
  @IsString()
  religion!: string | null;

  @ApiProperty({ nullable: true })
  @IsOptional()
  @IsString()
  bloodGroup!: string | null;

  @ApiProperty({ nullable: true })
  @IsOptional()
  @IsString()
  genotype!: string | null;

  @ApiProperty({ nullable: true })
  @IsOptional()
  @IsString()
  address!: string | null;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  className!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  armName!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  classId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  armId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  guardianFirstName!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  guardianLastName!: string;

  @ApiProperty()
  @IsEmail()
  guardianEmail!: string;

  @ApiProperty({ nullable: true })
  @IsOptional()
  @IsString()
  guardianPhone!: string | null;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  guardianRelationship!: string;
}

export class BulkImportCommitDto {
  @ApiProperty({
    description: 'The term every row in this batch is enrolled into',
  })
  @IsString()
  @IsNotEmpty()
  termId!: string;

  @ApiProperty({ type: [ValidStudentImportRowDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ValidStudentImportRowDto)
  rows!: ValidStudentImportRowDto[];
}
