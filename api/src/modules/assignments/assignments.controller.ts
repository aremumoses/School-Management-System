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
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { RequestUser } from '../../common/types/auth.types';
import { AssignmentRemindersService } from './assignment-reminders.service';
import { AssignmentsService } from './assignments.service';
import {
  CreateAssignmentDto,
  GradeSubmissionDto,
  QueryAssignmentsDto,
  SubmitAssignmentDto,
  UpdateAssignmentDto,
} from './dto/assignment.dto';
import { GradebookService } from './gradebook.service';

const TEACHER_ROLES = ['SUBJECT_TEACHER', 'CLASS_TEACHER'] as const;

const FILE_LIMITS = { limits: { fileSize: 10 * 1024 * 1024 } };
const BINARY_BODY = {
  schema: {
    type: 'object',
    properties: { file: { type: 'string', format: 'binary' } },
  },
} as const;

@ApiTags('assignments')
@Controller('assignments')
export class AssignmentsController {
  constructor(
    private readonly assignmentsService: AssignmentsService,
    private readonly remindersService: AssignmentRemindersService,
  ) {}

  @Roles(...TEACHER_ROLES)
  @Post()
  @ApiOperation({
    summary:
      'Post an assignment — the caller must actually be assigned to the classSubject this term',
  })
  create(@Body() dto: CreateAssignmentDto, @CurrentUser() user: RequestUser) {
    return this.assignmentsService.create(dto, user);
  }

  @Roles(...TEACHER_ROLES, 'ADMIN', 'VICE_PRINCIPAL', 'STUDENT', 'PARENT')
  @Get()
  @ApiOperation({
    summary:
      "List assignments — teachers their own, students their class's (with own submission), parents per linked ward",
  })
  list(@Query() query: QueryAssignmentsDto, @CurrentUser() user: RequestUser) {
    return this.assignmentsService.list(query, user);
  }

  // Literal path before ':id'.
  @Roles('ADMIN')
  @Post('reminders/run')
  @ApiOperation({
    summary:
      'Manually run the due-soon reminder check (the daily 7am cron runs the same code)',
  })
  runReminders() {
    return this.remindersService.runDueSoonCheck();
  }

  @Roles(...TEACHER_ROLES, 'ADMIN', 'VICE_PRINCIPAL', 'STUDENT', 'PARENT')
  @Get(':id')
  @ApiOperation({
    summary:
      'One assignment — teachers/admin get the full submissions list, a student their own submission, a parent their wards’',
  })
  getOne(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.assignmentsService.getOrThrow(id, user);
  }

  @Roles(...TEACHER_ROLES)
  @Patch(':id')
  @ApiOperation({ summary: 'Edit your own assignment' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateAssignmentDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.assignmentsService.update(id, dto, user);
  }

  @Roles('STUDENT')
  @Post(':id/submit')
  @ApiOperation({
    summary:
      'Submit a text response — rejected after the due date unless the assignment allows late submission',
  })
  submit(
    @Param('id') id: string,
    @Body() dto: SubmitAssignmentDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.assignmentsService.submit(id, dto, user);
  }

  @Roles('STUDENT')
  @Post(':id/submit-file')
  @UseInterceptors(FileInterceptor('file', FILE_LIMITS))
  @ApiConsumes('multipart/form-data')
  @ApiBody(BINARY_BODY)
  @ApiOperation({
    summary:
      'Attach/replace the file part of your submission — same deadline rules',
  })
  submitFile(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.assignmentsService.submitFile(id, file, user);
  }

  @Roles(...TEACHER_ROLES)
  @Patch(':id/submissions/:submissionId/grade')
  @ApiOperation({
    summary:
      'Grade a submission with feedback — same assignment-ownership check as creation',
  })
  grade(
    @Param('id') id: string,
    @Param('submissionId') submissionId: string,
    @Body() dto: GradeSubmissionDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.assignmentsService.grade(id, submissionId, dto, user);
  }

  @Roles(...TEACHER_ROLES)
  @Post(':id/attachment')
  @UseInterceptors(FileInterceptor('file', FILE_LIMITS))
  @ApiConsumes('multipart/form-data')
  @ApiBody(BINARY_BODY)
  @ApiOperation({ summary: 'Attach a file to your own assignment' })
  uploadAttachment(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.assignmentsService.uploadAttachment(id, file, user);
  }
}

@ApiTags('assignments')
@Controller('classes')
export class GradebookController {
  constructor(private readonly gradebookService: GradebookService) {}

  @Roles(...TEACHER_ROLES, 'ADMIN')
  @Get(':classSubjectId/gradebook')
  @ApiQuery({ name: 'sessionId', required: true })
  @ApiQuery({
    name: 'threshold',
    required: false,
    description:
      'At-risk cut-off (%) — omit to use the school-configured default (Stage 29 AtRiskThresholdConfig.caAverageFloor)',
  })
  @ApiOperation({
    summary:
      'Multi-term score history for a class/subject: per-student averages, class stats, distribution, at-risk flags',
  })
  getGradebook(
    @Param('classSubjectId') classSubjectId: string,
    @Query('sessionId') sessionId: string,
    @CurrentUser() user: RequestUser,
    @Query('threshold') threshold?: string,
  ) {
    return this.gradebookService.getGradebook(
      classSubjectId,
      sessionId,
      threshold !== undefined ? Number(threshold) : undefined,
      user,
    );
  }
}
