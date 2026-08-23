import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Header,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { IsArray, IsNumber, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import type { Response } from 'express';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import type { RequestUser } from '../../../common/types/auth.types';
import type { ScoreBulkEntry } from './scores-bulk-import.service';
import { ScoresBulkImportService } from './scores-bulk-import.service';

class ScoreBulkEntryDto implements ScoreBulkEntry {
  @IsString() studentId!: string;
  @IsString() assessmentComponentId!: string;
  @IsNumber() score!: number;
}

class ScoresBulkCommitDto {
  @IsString() classSubjectId!: string;
  @IsString() termId!: string;
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScoreBulkEntryDto)
  entries!: ScoreBulkEntryDto[];
}

@ApiTags('scores')
@Controller('scores/bulk-import')
export class ScoresBulkImportController {
  constructor(private readonly service: ScoresBulkImportService) {}

  @Roles('ADMIN', 'EXAM_OFFICER')
  @Get('template')
  @Header(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  @Header(
    'Content-Disposition',
    'attachment; filename="scores-import-template.xlsx"',
  )
  @ApiQuery({ name: 'classSubjectId', required: true })
  @ApiQuery({ name: 'termId', required: true })
  @ApiOperation({
    summary:
      'Download a pre-filled scores import template for a specific class/subject/term',
  })
  async downloadTemplate(
    @Query('classSubjectId') classSubjectId: string,
    @Query('termId') termId: string,
    @Res() res: Response,
  ): Promise<void> {
    if (!classSubjectId || !termId)
      throw new BadRequestException('classSubjectId and termId are required');
    const buffer = await this.service.buildTemplate(classSubjectId, termId);
    res.send(buffer);
  }

  @Roles('ADMIN', 'EXAM_OFFICER')
  @Post('preview')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiQuery({ name: 'classSubjectId', required: true })
  @ApiQuery({ name: 'termId', required: true })
  @ApiOperation({
    summary: 'Validate a scores import file without writing anything',
  })
  preview(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Query('classSubjectId') classSubjectId: string,
    @Query('termId') termId: string,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    if (!classSubjectId || !termId)
      throw new BadRequestException('classSubjectId and termId are required');
    return this.service.preview(file.buffer, classSubjectId, termId);
  }

  @Roles('ADMIN', 'EXAM_OFFICER')
  @Post('commit')
  @ApiOperation({
    summary:
      "Upsert scores from the preview's valid entries — validates max-scores before writing",
  })
  commit(@Body() dto: ScoresBulkCommitDto, @CurrentUser() user: RequestUser) {
    return this.service.commit(
      dto.classSubjectId,
      dto.termId,
      dto.entries,
      user.id,
    );
  }
}
