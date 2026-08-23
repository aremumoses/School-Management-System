import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateClubDto {
  @ApiProperty({ example: 'Debate Club' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'Wednesdays, 4–5pm, Hall B' })
  @IsOptional()
  @IsString()
  meetingSchedule?: string;

  @ApiPropertyOptional({ description: 'The supervising teacher' })
  @IsOptional()
  @IsString()
  patronStaffId?: string;
}

export class UpdateClubDto extends PartialType(CreateClubDto) {}

export class AddClubMemberDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  studentId!: string;
}
