import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DocumentType } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class GenerateDocumentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  studentId!: string;

  @ApiProperty({ enum: DocumentType })
  @IsEnum(DocumentType)
  type!: DocumentType;

  // Accepted for forward compatibility with the prompt's literal request
  // shape, but not yet meaningful — there's exactly one built-in template
  // per DocumentType (document.template.ts), not a TemplateCRUD system, so
  // this is currently ignored rather than looked up. Revisit if a school
  // ever needs more than one testimonial/certificate wording variant.
  @ApiPropertyOptional({
    deprecated: true,
    description:
      'Reserved for future multi-template support — currently unused.',
  })
  @IsOptional()
  @IsString()
  templateId?: string;
}

export class QueryDocumentsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  studentId?: string;
}
