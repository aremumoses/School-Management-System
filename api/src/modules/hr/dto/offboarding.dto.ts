import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class InitiateOffboardingDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  staffId!: string;
}

class ChecklistItemUpdateDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  key!: string;

  @ApiProperty()
  @IsBoolean()
  completed!: boolean;
}

export class UpdateOffboardingDto {
  @ApiPropertyOptional({ type: ChecklistItemUpdateDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ChecklistItemUpdateDto)
  item?: ChecklistItemUpdateDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  finalPayAmount?: number;
}
