import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, ValidateIf } from 'class-validator';

export class CreateArmDto {
  @ApiProperty({ example: 'Gold' })
  @IsString()
  @IsNotEmpty()
  name!: string;
}

export class UpdateArmDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description:
      "Staff id to set as this arm's Class Teacher/Form Master, or null to unassign.",
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((o: UpdateArmDto) => o.classTeacherId !== null)
  @IsString()
  classTeacherId?: string | null;
}
