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
import { ApiOperation, ApiProduces, ApiTags } from '@nestjs/swagger';
import ExcelJS from 'exceljs';
import type { Response } from 'express';
import {
  createSheet,
  sendExcelResponse,
} from '../../common/excel/excel-export.util';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { RequestUser } from '../../common/types/auth.types';
import {
  CreateHrLeaveRequestDto,
  CreateLeaveTypeDto,
  DecideHrLeaveRequestDto,
  UpdateLeaveTypeDto,
  UpsertLeaveBalanceDto,
} from './dto/leave.dto';
import { LeaveService } from './leave.service';

@ApiTags('hr-leave')
@Controller('hr')
export class LeaveController {
  constructor(private readonly service: LeaveService) {}

  @Roles()
  @Get('leave-types')
  listLeaveTypes() {
    return this.service.listLeaveTypes();
  }

  @Roles('HR_OFFICER', 'ADMIN')
  @Post('leave-types')
  createLeaveType(@Body() dto: CreateLeaveTypeDto) {
    return this.service.createLeaveType(dto);
  }

  @Roles('HR_OFFICER', 'ADMIN')
  @Patch('leave-types/:id')
  updateLeaveType(@Param('id') id: string, @Body() dto: UpdateLeaveTypeDto) {
    return this.service.updateLeaveType(id, dto);
  }

  @Roles()
  @Get('leave-balances/mine')
  myBalances(@CurrentUser() user: RequestUser, @Query('year') year?: string) {
    return this.service.listBalancesForStaff(
      user.id,
      year ? Number(year) : new Date().getFullYear(),
    );
  }

  @Roles('HR_OFFICER', 'ADMIN')
  @Get('leave-balances')
  listAllBalances(@Query('year') year?: string) {
    return this.service.listAllBalances(
      year ? Number(year) : new Date().getFullYear(),
    );
  }

  @Roles('HR_OFFICER', 'ADMIN')
  @Post('leave-balances')
  upsertBalance(@Body() dto: UpsertLeaveBalanceDto) {
    return this.service.upsertBalance(dto);
  }

  @Roles('HR_OFFICER', 'ADMIN')
  @Get('leave-balances/export')
  @ApiProduces(
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  @ApiOperation({ summary: 'Leave balance report as Excel' })
  async exportBalances(
    @Query('year') year: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    const resolvedYear = year ? Number(year) : new Date().getFullYear();
    const balances = await this.service.listAllBalances(resolvedYear);

    const wb = new ExcelJS.Workbook();
    const sheet = createSheet(wb, 'Leave Balances', [
      'Staff Name',
      'Leave Type',
      'Year',
      'Allocated Days',
      'Used Days',
      'Remaining Days',
    ]);
    for (const b of balances) {
      sheet.addRow([
        `${b.staff.firstName} ${b.staff.lastName}`,
        b.leaveType.name,
        b.year,
        b.allocatedDays,
        b.usedDays,
        b.allocatedDays - b.usedDays,
      ]);
    }
    await sendExcelResponse(res, wb, `leave-balances-${resolvedYear}.xlsx`);
  }

  @Roles()
  @Post('leave-requests')
  create(
    @Body() dto: CreateHrLeaveRequestDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.create(dto, user);
  }

  @Roles()
  @Get('leave-requests/mine')
  mine(@CurrentUser() user: RequestUser) {
    return this.service.listMyRequests(user.id);
  }

  @Roles('HR_OFFICER', 'ADMIN')
  @Get('leave-requests')
  listAll(@Query('status') status?: 'PENDING' | 'APPROVED' | 'REJECTED') {
    return this.service.listAllRequests(status);
  }

  @Roles('HR_OFFICER', 'ADMIN')
  @Patch('leave-requests/:id/decide')
  decide(
    @Param('id') id: string,
    @Body() dto: DecideHrLeaveRequestDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.decide(id, dto, user);
  }
}
