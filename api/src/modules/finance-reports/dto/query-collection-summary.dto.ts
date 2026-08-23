import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class QueryCollectionSummaryDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  termId!: string;
}
