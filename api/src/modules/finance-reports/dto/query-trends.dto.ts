import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsOptional } from 'class-validator';

export class QueryTrendsDto {
  @ApiPropertyOptional({
    enum: ['collection', 'outstanding'],
    default: 'collection',
  })
  @IsOptional()
  @IsIn(['collection', 'outstanding'])
  metric?: 'collection' | 'outstanding';

  @ApiPropertyOptional({ enum: ['term', 'session'], default: 'term' })
  @IsOptional()
  @IsIn(['term', 'session'])
  granularity?: 'term' | 'session';
}

export class QueryExpensesSummaryDto {
  @ApiPropertyOptional({ description: 'ISO date — inclusive lower bound' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'ISO date — inclusive upper bound' })
  @IsOptional()
  @IsDateString()
  to?: string;
}
