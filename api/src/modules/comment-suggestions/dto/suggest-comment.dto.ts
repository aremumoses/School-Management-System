import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

export enum CommentType {
  FORM_TEACHER = 'FORM_TEACHER',
  PRINCIPAL = 'PRINCIPAL',
}

export class SuggestCommentDto {
  @ApiProperty({
    enum: CommentType,
    description:
      "Which comment field this suggestion is for — shapes the LLM prompt's tone (form-teacher comments read more personal/pastoral, principal comments more formal/summary).",
  })
  @IsEnum(CommentType)
  commentType!: CommentType;
}
