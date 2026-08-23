import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { ApiOperation, ApiProduces, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  CreateExternalExamCandidateDto,
  UpdateExternalExamCandidateDto,
} from './dto/exam-logistics.dto';
import { ExternalExamsService } from './external-exams.service';

const MANAGE_ROLES = ['EXAM_OFFICER', 'ADMIN'] as const;

@ApiTags('external-exams')
@Controller('external-exams/candidates')
export class ExternalExamsController {
  constructor(private readonly externalExamsService: ExternalExamsService) {}

  @Roles(...MANAGE_ROLES)
  @Post()
  @ApiOperation({
    summary: 'Register a candidate for an external exam body/session',
  })
  create(@Body() dto: CreateExternalExamCandidateDto) {
    return this.externalExamsService.create(dto);
  }

  @Roles(...MANAGE_ROLES)
  @Get()
  @ApiQuery({ name: 'examBody', required: false })
  @ApiQuery({ name: 'sessionYear', required: false })
  @ApiOperation({
    summary: 'Candidate list, filterable by exam body/session year',
  })
  list(
    @Query('examBody') examBody?: string,
    @Query('sessionYear') sessionYear?: string,
  ) {
    return this.externalExamsService.list(
      examBody,
      sessionYear ? Number(sessionYear) : undefined,
    );
  }

  @Roles(...MANAGE_ROLES)
  @Get('export')
  @ApiQuery({ name: 'examBody', required: false })
  @ApiQuery({ name: 'sessionYear', required: false })
  @ApiProduces(
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  @ApiOperation({
    summary:
      "Excel export of the candidate list — a generic starting point a school reformats to its exam body's exact template, not a guaranteed drop-in upload file",
  })
  async export(
    @Query('examBody') examBody: string | undefined,
    @Query('sessionYear') sessionYear: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    await this.externalExamsService.exportCandidates(
      examBody,
      sessionYear ? Number(sessionYear) : undefined,
      res,
    );
  }

  @Roles(...MANAGE_ROLES)
  @Patch(':id')
  @ApiOperation({
    summary:
      'Update a candidate — subject combination, registration number, or status',
  })
  update(@Param('id') id: string, @Body() dto: UpdateExternalExamCandidateDto) {
    return this.externalExamsService.update(id, dto);
  }
}

@ApiTags('external-exams')
@Controller('students')
export class StudentCaSummaryController {
  constructor(private readonly externalExamsService: ExternalExamsService) {}

  @Roles(...MANAGE_ROLES)
  @Get(':id/ca-summary-for-external-body')
  @ApiOperation({
    summary:
      "Maps the student's internal CA scores into a per-subject summary for cross-checking before an external body submission",
  })
  getCaSummary(@Param('id') id: string) {
    return this.externalExamsService.getCaSummary(id);
  }
}
