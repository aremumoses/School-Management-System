import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post,
  Res,
} from '@nestjs/common';
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
import { AssignRoleDto } from './dto/assign-role.dto';
import { CreateStaffDto } from './dto/create-staff.dto';
import { CreateTeacherAssignmentDto } from './dto/create-teacher-assignment.dto';
import { UpdateScoreEntryDeadlineDto } from './dto/update-score-entry-deadline.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { StaffService } from './staff.service';

@ApiTags('staff')
@Controller('staff')
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  // EXAM_OFFICER included per Stage 23 — the invigilation roster's staff
  // picker needs to browse the full staff list to assign invigilators.
  @Roles('ADMIN', 'HR_OFFICER', 'EXAM_OFFICER')
  @Get()
  @ApiOperation({ summary: 'List all staff' })
  listStaff() {
    return this.staffService.listStaff();
  }

  // Declared before ':id' so literal paths aren't swallowed by the dynamic param route.
  @Roles()
  @Get('me')
  @ApiOperation({ summary: "Current authenticated staff member's own record" })
  async getMe(@CurrentUser() user: RequestUser) {
    if (user.userType !== 'STAFF') {
      throw new NotFoundException('No staff record for this account');
    }
    return this.staffService.getStaff(user.id);
  }

  @Roles('ADMIN', 'VICE_PRINCIPAL', 'HR_OFFICER')
  @Get('export')
  @ApiProduces(
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  @ApiOperation({ summary: 'Export the staff directory as an Excel file' })
  async exportStaff(@Res() res: Response): Promise<void> {
    const staff = await this.staffService.listStaff();

    const wb = new ExcelJS.Workbook();
    const sheet = createSheet(wb, 'Staff', [
      'First Name',
      'Last Name',
      'Email',
      'Phone',
      'Employment Date',
      'Roles',
      'Active',
    ]);

    for (const s of staff) {
      sheet.addRow([
        s.firstName,
        s.lastName,
        s.email,
        s.phone ?? '',
        s.employmentDate
          ? new Date(s.employmentDate).toLocaleDateString('en-GB')
          : '',
        s.roles.map((r) => r.role).join(', '),
        s.isActive ? 'Yes' : 'No',
      ]);
    }

    await sendExcelResponse(res, wb, `staff-roster-${Date.now()}.xlsx`);
  }

  @Roles('ADMIN', 'HR_OFFICER')
  @Get(':id')
  @ApiOperation({ summary: 'Get one staff member' })
  getStaff(@Param('id') id: string) {
    return this.staffService.getStaff(id);
  }

  @Roles('ADMIN')
  @Post()
  @ApiOperation({
    summary:
      'Create a staff member (returns a temporary password if none was supplied)',
  })
  createStaff(@Body() dto: CreateStaffDto) {
    return this.staffService.createStaff(dto);
  }

  @Roles('ADMIN')
  @Patch(':id')
  @ApiOperation({ summary: 'Update a staff member' })
  updateStaff(
    @Param('id') id: string,
    @Body() dto: UpdateStaffDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.staffService.updateStaff(id, dto, user.id);
  }

  @Roles('ADMIN')
  @Post(':id/roles')
  @ApiOperation({ summary: 'Assign a role to a staff member' })
  assignRole(@Param('id') id: string, @Body() dto: AssignRoleDto) {
    return this.staffService.assignRole(id, dto);
  }

  @Roles('ADMIN')
  @Delete(':id/roles/:roleId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a role from a staff member' })
  async removeRole(
    @Param('id') id: string,
    @Param('roleId') roleId: string,
  ): Promise<void> {
    await this.staffService.removeRole(id, roleId);
  }

  @Roles()
  @Get(':id/teaching-assignments')
  @ApiOperation({
    summary:
      "List a staff member's teaching assignments (self, or ADMIN/HR_OFFICER for anyone)",
  })
  listTeachingAssignments(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.staffService.listTeachingAssignments(id, user);
  }

  @Roles('ADMIN')
  @Post(':id/teaching-assignments')
  @ApiOperation({
    summary: 'Assign a staff member to teach a class+subject for a term',
  })
  addTeachingAssignment(
    @Param('id') id: string,
    @Body() dto: CreateTeacherAssignmentDto,
  ) {
    return this.staffService.addTeachingAssignment(id, dto);
  }

  @Roles('ADMIN', 'EXAM_OFFICER')
  @Patch('teaching-assignments/:assignmentId/deadline')
  @ApiOperation({
    summary:
      "Set, change, or clear a teaching assignment's score-entry deadline",
  })
  updateScoreEntryDeadline(
    @Param('assignmentId') assignmentId: string,
    @Body() dto: UpdateScoreEntryDeadlineDto,
  ) {
    return this.staffService.updateScoreEntryDeadline(assignmentId, dto);
  }

  @Roles('ADMIN')
  @Delete('teaching-assignments/:assignmentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a teaching assignment' })
  async removeTeachingAssignment(
    @Param('assignmentId') assignmentId: string,
  ): Promise<void> {
    await this.staffService.removeTeachingAssignment(assignmentId);
  }
}
