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
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiProduces,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import ExcelJS from 'exceljs';
import {
  createSheet,
  sendExcelResponse,
} from '../../common/excel/excel-export.util';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { RequestUser } from '../../common/types/auth.types';
import { AtRiskFlaggingService } from '../at-risk/at-risk-flagging.service';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { CreateStudentDto } from './dto/create-student.dto';
import { LinkGuardianDto } from './dto/link-guardian.dto';
import { QueryStudentsDto } from './dto/query-students.dto';
import { UpdateEnrollmentDto } from './dto/update-enrollment.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { StudentsService } from './students.service';

@ApiTags('students')
@Controller('students')
export class StudentsController {
  constructor(
    private readonly studentsService: StudentsService,
    private readonly atRiskFlagging: AtRiskFlaggingService,
  ) {}

  @Roles()
  @Get()
  @ApiOperation({
    summary: 'List students (paginated, filterable, role-scoped)',
  })
  listStudents(
    @Query() query: QueryStudentsDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.studentsService.listStudents(query, user);
  }

  // Declared before ':id' so literal paths aren't swallowed by the dynamic param route.
  @Roles('ADMIN', 'VICE_PRINCIPAL')
  @Get('export')
  @ApiProduces(
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  @ApiOperation({ summary: 'Export the student roster as an Excel file' })
  async exportStudents(
    @Query() query: QueryStudentsDto,
    @CurrentUser() user: RequestUser,
    @Res() res: Response,
  ): Promise<void> {
    const unlimitedQuery = { ...query, pageSize: 5000, page: 1 };
    const { data } = await this.studentsService.listStudents(
      unlimitedQuery,
      user,
    );

    const wb = new ExcelJS.Workbook();
    const sheet = createSheet(wb, 'Students', [
      'Admission No.',
      'First Name',
      'Last Name',
      'Gender',
      'Date of Birth',
      'State of Origin',
      'Religion',
      'Blood Group',
      'Class',
      'Arm',
      'Status',
      'Active',
    ]);

    for (const s of data as ((typeof data)[0] & {
      enrollments?: Array<{
        class: { name: string };
        arm: { name: string };
        status: string;
      }>;
    })[]) {
      const enrollment = s.enrollments?.[0];
      sheet.addRow([
        s.admissionNumber,
        s.firstName,
        s.lastName,
        s.gender,
        s.dateOfBirth
          ? new Date(s.dateOfBirth).toLocaleDateString('en-GB')
          : '',
        s.stateOfOrigin ?? '',
        s.religion ?? '',
        s.bloodGroup ?? '',
        enrollment?.class.name ?? '',
        enrollment?.arm.name ?? '',
        enrollment?.status ?? '',
        s.isActive ? 'Yes' : 'No',
      ]);
    }

    await sendExcelResponse(res, wb, `students-roster-${Date.now()}.xlsx`);
  }

  // Declared before ':id' so literal paths aren't swallowed by the dynamic
  // param route — same reasoning as 'export' above. This one was actually
  // caught live: AtRiskModule originally registered this route on its own
  // controller in a module imported after StudentsModule, so ":id" was
  // winning and "at-risk" 404'd as "Student not found" (Stage 29).
  @Roles('CLASS_TEACHER', 'ADMIN', 'VICE_PRINCIPAL')
  @Get('at-risk')
  @ApiQuery({
    name: 'classId',
    required: false,
    description:
      'An arm id — required for Class Teachers (their own class only), optional/omittable for Admin/VP',
  })
  @ApiOperation({
    summary:
      'Currently flagged at-risk students, with reason (attendance/CA/both) and flagged date',
  })
  getAtRiskStudents(
    @Query('classId') classId: string | undefined,
    @CurrentUser() user: RequestUser,
  ) {
    return this.atRiskFlagging.getAtRiskStudents(classId, user);
  }

  @Roles()
  @Get(':id')
  @ApiOperation({ summary: 'Get one student' })
  getStudent(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.studentsService.getStudent(id, user);
  }

  @Roles('ADMIN')
  @Post()
  @ApiOperation({
    summary:
      'Create a student (auto-generates the admission number; returns a temporary password if an email was supplied without one)',
  })
  createStudent(@Body() dto: CreateStudentDto) {
    return this.studentsService.createStudent(dto);
  }

  // STUDENT included for self-service (Stage 15 profile page) — the
  // service restricts a student caller to their own record and to the
  // non-sensitive field whitelist (address only); everything else stays
  // Admin-managed through enrollment/admin flows.
  @Roles('ADMIN', 'STUDENT')
  @Patch(':id')
  @ApiOperation({
    summary:
      'Update a student (Admin: any field; the student themselves: address only)',
  })
  updateStudent(
    @Param('id') id: string,
    @Body() dto: UpdateStudentDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.studentsService.updateStudent(id, dto, user);
  }

  @Roles('ADMIN')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a student (never hard-deleted)' })
  async softDeleteStudent(@Param('id') id: string): Promise<void> {
    await this.studentsService.softDeleteStudent(id);
  }

  @Roles('ADMIN')
  @Post(':id/photo')
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
  @ApiOperation({ summary: "Upload a student's photo" })
  uploadPhoto(
    @Param('id') id: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.studentsService.uploadPhoto(id, file);
  }

  @Roles('ADMIN')
  @Post(':id/documents')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        type: { type: 'string', example: 'testimonial' },
      },
    },
  })
  @ApiOperation({
    summary: "Upload a document to a student's document repository",
  })
  uploadDocument(
    @Param('id') id: string,
    @Body() dto: UploadDocumentDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.studentsService.uploadDocument(id, dto.type, file);
  }

  @Roles('ADMIN')
  @Post(':id/guardians')
  @ApiOperation({
    summary:
      'Link a guardian to a student — pass guardianId to link an existing one, or full details to create+link',
  })
  linkGuardian(@Param('id') id: string, @Body() dto: LinkGuardianDto) {
    return this.studentsService.linkGuardian(id, dto);
  }

  @Roles('ADMIN')
  @Delete(':id/guardians/:guardianId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Unlink a guardian from a student' })
  async unlinkGuardian(
    @Param('id') id: string,
    @Param('guardianId') guardianId: string,
  ): Promise<void> {
    await this.studentsService.unlinkGuardian(id, guardianId);
  }

  @Roles()
  @Get(':id/enrollments')
  @ApiOperation({
    summary: "A student's full enrollment history across sessions",
  })
  listEnrollments(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.studentsService.listEnrollments(id, user);
  }

  @Roles('ADMIN')
  @Post(':id/enrollments')
  @ApiOperation({
    summary:
      'Enroll a student into a class+arm for a term (blocks a second concurrent ACTIVE enrollment)',
  })
  createEnrollment(@Param('id') id: string, @Body() dto: CreateEnrollmentDto) {
    return this.studentsService.createEnrollment(id, dto);
  }

  @Roles('ADMIN')
  @Patch(':id/enrollments/:enrollmentId')
  @ApiOperation({
    summary: "Transition an enrollment's status (e.g. to PROMOTED, WITHDRAWN)",
  })
  updateEnrollmentStatus(
    @Param('id') id: string,
    @Param('enrollmentId') enrollmentId: string,
    @Body() dto: UpdateEnrollmentDto,
  ) {
    return this.studentsService.updateEnrollmentStatus(id, enrollmentId, dto);
  }
}
