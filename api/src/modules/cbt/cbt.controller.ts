import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
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
import { CBTAttemptsService } from './cbt-attempts.service';
import { CBTTestsService } from './cbt-tests.service';
import {
  AddTestQuestionsDto,
  AutoAssembleDto,
  CreateCBTTestDto,
  CreateQuestionDto,
  GradeEssayDto,
  QueryQuestionsDto,
  ReviewQuestionDto,
  SaveAnswerDto,
  UpdateCBTTestDto,
  UpdateQuestionDto,
} from './dto/cbt.dto';
import { QuestionsService } from './questions.service';

// docs/03-roles-and-permissions.md §2's "CBT/Exam engine" row gives Class
// Teacher "–" (no access) — only Subject Teacher (E, own subject) and Exam
// Officer (F) author/build. Stage 31 audit: CLASS_TEACHER had been
// included here since an earlier stage, letting a Class Teacher author/edit
// exam questions and grade essays school-wide with no subject tie — fixed.
const AUTHOR_ROLES = ['SUBJECT_TEACHER', 'EXAM_OFFICER', 'ADMIN'] as const;
const BUILDER_ROLES = ['SUBJECT_TEACHER', 'EXAM_OFFICER'] as const;

@ApiTags('cbt')
@Controller('questions')
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Roles(...AUTHOR_ROLES)
  @Post()
  @ApiOperation({
    summary:
      'Author a bank question — teacher-authored ones await Exam Officer approval',
  })
  create(@Body() dto: CreateQuestionDto, @CurrentUser() user: RequestUser) {
    return this.questionsService.create(dto, user);
  }

  @Roles(...AUTHOR_ROLES)
  @Get()
  @ApiOperation({
    summary:
      'Browse the bank (filter by subject/topic/difficulty/type/status) — teachers see the approved bank plus their own',
  })
  list(@Query() query: QueryQuestionsDto, @CurrentUser() user: RequestUser) {
    return this.questionsService.list(query, user);
  }

  @Roles(...AUTHOR_ROLES)
  @Patch(':id')
  @ApiOperation({
    summary: 'Edit a question — a teacher editing a RETURNED one resubmits it',
  })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateQuestionDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.questionsService.update(id, dto, user);
  }

  @Roles('EXAM_OFFICER', 'ADMIN')
  @Patch(':id/review')
  @ApiOperation({
    summary: 'Approve or return a PENDING question (notes required on return)',
  })
  review(
    @Param('id') id: string,
    @Body() dto: ReviewQuestionDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.questionsService.review(id, dto, user);
  }

  @Roles(...AUTHOR_ROLES)
  @Post(':id/image')
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
  @ApiOperation({ summary: 'Attach a diagram/image to a question' })
  uploadImage(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.questionsService.uploadImage(id, file, user);
  }
}

@ApiTags('cbt')
@Controller('cbt')
export class CBTController {
  constructor(
    private readonly testsService: CBTTestsService,
    private readonly attemptsService: CBTAttemptsService,
  ) {}

  // ---- Tests ----

  @Roles(...BUILDER_ROLES)
  @Post('tests')
  @ApiOperation({
    summary:
      'Create a test shell — settings only; questions come via manual pick or auto-assemble',
  })
  createTest(@Body() dto: CreateCBTTestDto, @CurrentUser() user: RequestUser) {
    return this.testsService.create(dto, user);
  }

  @Roles(...BUILDER_ROLES, 'ADMIN', 'STUDENT')
  @Get('tests')
  @ApiOperation({
    summary:
      "List tests — teachers their own, EO/Admin all, students their class's with own attempts",
  })
  listTests(@CurrentUser() user: RequestUser) {
    return this.testsService.list(user);
  }

  @Roles(...BUILDER_ROLES, 'ADMIN')
  @Get('tests/:id')
  @ApiOperation({ summary: 'Builder view — questions incl. correct answers' })
  getTest(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.testsService.getForBuilder(id, user);
  }

  @Roles(...BUILDER_ROLES)
  @Patch('tests/:id')
  @ApiOperation({ summary: 'Edit test settings' })
  updateTest(
    @Param('id') id: string,
    @Body() dto: UpdateCBTTestDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.testsService.update(id, dto, user);
  }

  @Roles(...BUILDER_ROLES)
  @Post('tests/:id/questions')
  @ApiOperation({ summary: 'Hand-pick approved bank questions onto the test' })
  addQuestions(
    @Param('id') id: string,
    @Body() dto: AddTestQuestionsDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.testsService.addQuestions(id, dto, user);
  }

  @Roles(...BUILDER_ROLES)
  @Delete('tests/:id/questions/:questionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a question from the test' })
  async removeQuestion(
    @Param('id') id: string,
    @Param('questionId') questionId: string,
    @CurrentUser() user: RequestUser,
  ): Promise<void> {
    await this.testsService.removeQuestion(id, questionId, user);
  }

  @Roles(...BUILDER_ROLES)
  @Post('tests/:id/auto-assemble')
  @ApiOperation({
    summary:
      'Rule-based assembly ({topic, difficulty, count} rows) — rejects if the bank cannot satisfy a rule',
  })
  autoAssemble(
    @Param('id') id: string,
    @Body() dto: AutoAssembleDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.testsService.autoAssemble(id, dto, user);
  }

  @Roles(...BUILDER_ROLES, 'ADMIN')
  @Get('tests/:id/stats')
  @ApiOperation({
    summary: 'Score distribution, average, pass rate (teacher: own tests only)',
  })
  getStats(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.testsService.getStats(id, user);
  }

  @Roles(...BUILDER_ROLES, 'ADMIN')
  @Get('tests/:id/attempts')
  @ApiOperation({
    summary: 'Attempts + essay answers — the essay grading queue',
  })
  listAttempts(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.attemptsService.listAttemptsForGrading(id, user);
  }

  // ---- Taking ----

  @Roles('STUDENT')
  @Post('tests/:id/start')
  @ApiOperation({
    summary:
      'Start (or resume) an attempt — window + attempt-count enforced; question/option order randomized once and persisted',
  })
  start(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.attemptsService.start(id, user);
  }

  @Roles('STUDENT', ...BUILDER_ROLES, 'ADMIN')
  @Get('attempts/:id')
  @ApiOperation({
    summary:
      'The attempt — taking view (questions in saved order + saved answers) or result view once submitted',
  })
  getAttempt(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.attemptsService.getForOwner(id, user);
  }

  @Roles('STUDENT')
  @Patch('attempts/:id/answers')
  @ApiOperation({
    summary:
      'Auto-save one answer (upsert) — rejected once time is up, server-enforced',
  })
  saveAnswer(
    @Param('id') id: string,
    @Body() dto: SaveAnswerDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.attemptsService.saveAnswer(id, dto, user);
  }

  @Roles('STUDENT')
  @Post('attempts/:id/submit')
  @ApiOperation({
    summary: 'Submit — objective questions auto-grade immediately',
  })
  submit(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.attemptsService.submit(id, user);
  }

  @Roles('SUBJECT_TEACHER', 'EXAM_OFFICER', 'ADMIN')
  @Patch('attempts/:id/grade-essay')
  @ApiOperation({
    summary:
      'Grade one essay answer — the attempt finalizes and releases once every essay is graded',
  })
  gradeEssay(
    @Param('id') id: string,
    @Body() dto: GradeEssayDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.attemptsService.gradeEssay(id, dto, user);
  }
}

@ApiTags('cbt')
@Controller('students')
export class MockHistoryController {
  constructor(private readonly attemptsService: CBTAttemptsService) {}

  @Roles('STUDENT', 'EXAM_OFFICER', 'ADMIN')
  @Get(':id/mock-history')
  @ApiOperation({
    summary:
      "A student's JAMB mock-practice attempt history and score trend — separate from formal results",
  })
  getMockHistory(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.attemptsService.getMockHistory(id, user);
  }
}
