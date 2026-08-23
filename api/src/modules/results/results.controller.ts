import { Body, Controller, Get, Param, Patch, Post, Res } from '@nestjs/common';
import { ApiOperation, ApiProduces, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import ExcelJS from 'exceljs';
import {
  createSheet,
  sendExcelResponse,
} from '../../common/excel/excel-export.util';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { RequestUser } from '../../common/types/auth.types';
import { PrincipalCommentDto } from './dto/principal-comment.dto';
import { ReturnResultDto } from './dto/return-result.dto';
import { SubmitConductDto } from './dto/submit-conduct.dto';
import { ResultsService } from './results.service';

@ApiTags('results')
@Controller('results')
export class ResultsController {
  constructor(private readonly resultsService: ResultsService) {}

  @Roles('ADMIN', 'EXAM_OFFICER', 'VICE_PRINCIPAL', 'HOD', 'CLASS_TEACHER')
  @Get(':classArmId/:termId/status')
  @ApiOperation({
    summary:
      'Current workflow stage for a class/term, and which subjects are still outstanding',
  })
  getStatus(
    @Param('classArmId') armId: string,
    @Param('termId') termId: string,
  ) {
    return this.resultsService.getStatus(armId, termId);
  }

  @Roles()
  @Get(':classArmId/:termId/students/:studentId/report-card-data')
  @ApiOperation({
    summary:
      "A student's full report-card data, for an on-screen preview matching the PDF layout — restricted to the student themselves, their guardian, or staff, and gated behind PUBLISHED for the first two",
  })
  getReportCardData(
    @Param('classArmId') armId: string,
    @Param('termId') termId: string,
    @Param('studentId') studentId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.resultsService.getReportCardDataForViewer(
      studentId,
      armId,
      termId,
      user,
    );
  }

  @Roles('ADMIN', 'EXAM_OFFICER', 'VICE_PRINCIPAL', 'HOD', 'CLASS_TEACHER')
  @Get(':classArmId/:termId/conduct')
  @ApiOperation({
    summary:
      "Every active student's existing conduct ratings + form comment for this arm/term",
  })
  getConductRatings(
    @Param('classArmId') armId: string,
    @Param('termId') termId: string,
  ) {
    return this.resultsService.getConductRatings(armId, termId);
  }

  @Roles('ADMIN', 'CLASS_TEACHER')
  @Post(':classArmId/:termId/students/:studentId/conduct')
  @ApiOperation({
    summary:
      "Submit a student's affective/psychomotor ratings and form teacher's comment",
  })
  submitConduct(
    @Param('classArmId') armId: string,
    @Param('termId') termId: string,
    @Param('studentId') studentId: string,
    @Body() dto: SubmitConductDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.resultsService.submitConduct(
      armId,
      termId,
      studentId,
      dto,
      user,
    );
  }

  @Roles('ADMIN')
  @Patch(':classArmId/:termId/students/:studentId/principal-comment')
  @ApiOperation({ summary: "Set a student's principal's comment for the term" })
  setPrincipalComment(
    @Param('classArmId') armId: string,
    @Param('termId') termId: string,
    @Param('studentId') studentId: string,
    @Body() dto: PrincipalCommentDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.resultsService.setPrincipalComment(
      armId,
      termId,
      studentId,
      dto,
      user,
    );
  }

  @Roles('ADMIN', 'EXAM_OFFICER')
  @Post(':classArmId/:termId/collate')
  @ApiOperation({
    summary:
      'Collate the broadsheet (requires every subject locked) and move the workflow to Pending Approval',
  })
  collate(
    @Param('classArmId') armId: string,
    @Param('termId') termId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.resultsService.collate(armId, termId, user);
  }

  @Roles('ADMIN', 'EXAM_OFFICER', 'VICE_PRINCIPAL', 'HOD', 'CLASS_TEACHER')
  @Get(':classArmId/:termId/broadsheet')
  @ApiOperation({
    summary:
      'The live broadsheet for a class/term — positions, totals, grades, class averages',
  })
  getBroadsheet(
    @Param('classArmId') armId: string,
    @Param('termId') termId: string,
  ) {
    return this.resultsService.getBroadsheet(armId, termId);
  }

  @Roles('ADMIN')
  @Post(':classArmId/:termId/approve')
  @ApiOperation({
    summary: 'Approve a collated result (Pending Approval -> Approved)',
  })
  approve(
    @Param('classArmId') armId: string,
    @Param('termId') termId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.resultsService.approve(armId, termId, user);
  }

  @Roles('ADMIN')
  @Post(':classArmId/:termId/return')
  @ApiOperation({
    summary:
      'Return a collated result for correction (Pending Approval -> Returned)',
  })
  returnResult(
    @Param('classArmId') armId: string,
    @Param('termId') termId: string,
    @Body() dto: ReturnResultDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.resultsService.returnResult(armId, termId, dto, user);
  }

  @Roles('ADMIN')
  @Post(':classArmId/:termId/publish')
  @ApiOperation({
    summary:
      'Publish an approved result (Approved -> Published) and enqueue report-card generation',
  })
  publish(
    @Param('classArmId') armId: string,
    @Param('termId') termId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.resultsService.publish(armId, termId, user);
  }

  @Roles('ADMIN', 'EXAM_OFFICER')
  @Post(':classArmId/:termId/generate-report-cards')
  @ApiOperation({
    summary:
      'Enqueue PDF report-card generation for every active student in this class/term',
  })
  generateReportCards(
    @Param('classArmId') armId: string,
    @Param('termId') termId: string,
  ) {
    return this.resultsService.enqueueReportCards(armId, termId);
  }

  @Roles('ADMIN', 'EXAM_OFFICER', 'VICE_PRINCIPAL')
  @Get(':classArmId/:termId/broadsheet/export')
  @ApiProduces(
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  @ApiOperation({ summary: 'Export the broadsheet for a class/term as Excel' })
  async exportBroadsheet(
    @Param('classArmId') armId: string,
    @Param('termId') termId: string,
    @Res() res: Response,
  ): Promise<void> {
    const { rows } = await this.resultsService.getBroadsheet(armId, termId);

    const wb = new ExcelJS.Workbook();
    // Build dynamic subject headers from first row's subject list
    const subjectHeaders = rows[0]?.subjects.map((s) => s.subjectName) ?? [];
    const sheet = createSheet(wb, 'Broadsheet', [
      'Admission No.',
      'First Name',
      'Last Name',
      ...subjectHeaders,
      'Overall Position',
      'Total Score',
    ]);

    for (const row of rows) {
      sheet.addRow([
        row.admissionNumber,
        row.firstName,
        row.lastName,
        ...row.subjects.map((s) => s.total),
        row.overallPosition,
        row.totalScored,
      ]);
    }

    await sendExcelResponse(res, wb, `broadsheet-${armId}-${Date.now()}.xlsx`);
  }
}
