import { Body, Controller, Get, Param, Post, Query, Res } from '@nestjs/common';
import { ApiOperation, ApiProduces, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import ExcelJS from 'exceljs';
import {
  createSheet,
  sendExcelResponse,
} from '../../common/excel/excel-export.util';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { RequestUser } from '../../common/types/auth.types';
import { AttendanceService } from './attendance.service';
import { AttendanceSummaryQueryDto } from './dto/attendance-summary-query.dto';
import { ChronicAbsenteeismQueryDto } from './dto/chronic-absenteeism-query.dto';
import { MarkAttendanceDto } from './dto/mark-attendance.dto';
import { QueryAttendanceDto } from './dto/query-attendance.dto';
import { QueryClassAttendanceDto } from './dto/query-class-attendance.dto';

@ApiTags('attendance')
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Roles('ADMIN', 'CLASS_TEACHER', 'SUBJECT_TEACHER')
  @Post('mark')
  @ApiOperation({
    summary:
      'Mark attendance for a class (whole-day via Class Teacher, or per-period via Subject Teacher). Upserts — marking the same class/date twice updates rather than duplicates.',
  })
  markAttendance(
    @Body() dto: MarkAttendanceDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.attendanceService.markAttendance(dto, user);
  }

  @Roles()
  @Get()
  @ApiOperation({ summary: "A student's attendance history" })
  getStudentAttendance(
    @Query() query: QueryAttendanceDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.attendanceService.getStudentAttendance(query, user);
  }

  @Roles()
  @Get('class/:armId')
  @ApiOperation({ summary: "A class's attendance for a given day" })
  getClassAttendance(
    @Param('armId') armId: string,
    @Query() query: QueryClassAttendanceDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.attendanceService.getClassAttendance(armId, query, user);
  }

  @Roles()
  @Get('summary')
  @ApiOperation({
    summary:
      'Present/absent/late/excused counts and percentage for a student in a term (feeds the report card)',
  })
  getAttendanceSummary(
    @Query() query: AttendanceSummaryQueryDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.attendanceService.getAttendanceSummary(query, user);
  }

  @Roles('ADMIN', 'VICE_PRINCIPAL', 'HOD', 'EXAM_OFFICER')
  @Get('chronic-absenteeism')
  @ApiOperation({
    summary:
      'Students whose absence rate exceeds the given threshold, for the Admin dashboard',
  })
  getChronicAbsenteeism(@Query() query: ChronicAbsenteeismQueryDto) {
    return this.attendanceService.getChronicAbsenteeism(query);
  }

  @Roles('ADMIN', 'VICE_PRINCIPAL', 'CLASS_TEACHER', 'HOD')
  @Get('export')
  @ApiProduces(
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  @ApiQuery({ name: 'classId', required: false })
  @ApiQuery({ name: 'from', required: false, description: 'ISO date string' })
  @ApiQuery({ name: 'to', required: false, description: 'ISO date string' })
  @ApiOperation({ summary: 'Export attendance records as Excel' })
  async exportAttendance(
    @Query('classId') classId: string | undefined,
    @Query('from') from: string | undefined,
    @Query('to') to: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    const records = await this.attendanceService.exportAttendance({
      classId,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    });

    const wb = new ExcelJS.Workbook();
    const sheet = createSheet(wb, 'Attendance', [
      'Date',
      'Admission No.',
      'First Name',
      'Last Name',
      'Class',
      'Arm',
      'Status',
    ]);

    for (const r of records) {
      sheet.addRow([
        new Date(r.date).toLocaleDateString('en-GB'),
        r.admissionNumber,
        r.firstName,
        r.lastName,
        r.className,
        r.armName,
        r.status,
      ]);
    }

    await sendExcelResponse(res, wb, `attendance-${Date.now()}.xlsx`);
  }
}
