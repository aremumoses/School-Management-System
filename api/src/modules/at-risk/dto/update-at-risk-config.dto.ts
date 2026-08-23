import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNumber, Max, Min } from 'class-validator';

export class UpdateAtRiskConfigDto {
  @ApiProperty({
    example: 75,
    description:
      'Attendance-rate percentage floor — below this, a student is flagged',
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  attendanceRateFloor!: number;

  @ApiProperty({
    example: 40,
    description:
      'CA-running-average percentage floor — below this, a student is flagged',
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  caAverageFloor!: number;

  @ApiProperty({
    example: false,
    description:
      'Whether a new/resolved flag also notifies the guardian (SMS) — optional per spec',
  })
  @IsBoolean()
  notifyGuardianOnFlag!: boolean;
}
