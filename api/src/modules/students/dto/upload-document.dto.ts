import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class UploadDocumentDto {
  @ApiProperty({
    example: 'testimonial',
    description: 'Free-form document type/label',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  type!: string;
}
