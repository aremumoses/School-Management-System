import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { RequestUser } from '../../common/types/auth.types';
import {
  CreateLessonNoteDto,
  DuplicateLessonNoteDto,
  QueryLessonNotesDto,
  ReviewLessonNoteDto,
  UpdateLessonNoteDto,
} from './dto/lesson-note.dto';
import { LessonNotesService } from './lesson-notes.service';

const TEACHER_ROLES = ['SUBJECT_TEACHER', 'CLASS_TEACHER', 'HOD'] as const;
const REVIEWER_ROLES = ['HOD', 'ADMIN', 'VICE_PRINCIPAL'] as const;

@ApiTags('lesson-notes')
@Controller('lesson-notes')
export class LessonNotesController {
  constructor(private readonly lessonNotesService: LessonNotesService) {}

  @Roles(...TEACHER_ROLES)
  @Post()
  @ApiOperation({
    summary:
      'Submit a lesson note — the caller must actually be assigned to the classSubject this term',
  })
  create(@Body() dto: CreateLessonNoteDto, @CurrentUser() user: RequestUser) {
    return this.lessonNotesService.create(dto, user);
  }

  @Roles(...TEACHER_ROLES, 'ADMIN', 'VICE_PRINCIPAL')
  @Get()
  @ApiOperation({
    summary:
      'List lesson notes — teachers see their own; HOD/Admin/VP see everything',
  })
  list(@Query() query: QueryLessonNotesDto, @CurrentUser() user: RequestUser) {
    return this.lessonNotesService.list(query, user);
  }

  @Roles(...TEACHER_ROLES, 'ADMIN', 'VICE_PRINCIPAL')
  @Get(':id')
  @ApiOperation({ summary: 'Get one lesson note (same scoping as the list)' })
  getOne(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.lessonNotesService.getOrThrow(id, user);
  }

  @Roles(...TEACHER_ROLES)
  @Patch(':id')
  @ApiOperation({
    summary:
      'Edit your own note (not APPROVED ones) — editing a RETURNED note resubmits it as PENDING',
  })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateLessonNoteDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.lessonNotesService.update(id, dto, user);
  }

  @Roles(...REVIEWER_ROLES)
  @Patch(':id/review')
  @ApiOperation({
    summary:
      'Approve or return a PENDING note — notes are required when returning',
  })
  review(
    @Param('id') id: string,
    @Body() dto: ReviewLessonNoteDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.lessonNotesService.review(id, dto, user);
  }

  @Roles(...TEACHER_ROLES)
  @Post(':id/duplicate')
  @ApiOperation({
    summary:
      "Copy a note (typically last term's) into a new PENDING draft for the target term — starts its own approval cycle",
  })
  duplicate(
    @Param('id') id: string,
    @Body() dto: DuplicateLessonNoteDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.lessonNotesService.duplicate(id, dto, user);
  }

  @Roles(...TEACHER_ROLES)
  @Post(':id/attachment')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOperation({ summary: 'Attach a file to your own (non-approved) note' })
  uploadAttachment(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.lessonNotesService.uploadAttachment(id, file, user);
  }
}
