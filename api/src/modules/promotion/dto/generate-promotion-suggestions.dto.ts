import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, Max, Min } from 'class-validator';

export class GeneratePromotionSuggestionsDto {
  @ApiPropertyOptional({
    default: 40,
    description:
      'Minimum overall average (%) to suggest Promoted/Graduated rather than Repeated',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  threshold?: number;
}
