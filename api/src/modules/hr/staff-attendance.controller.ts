import { Controller, Get, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { RequestUser } from '../../common/types/auth.types';
import { QueryStaffAttendanceDto } from './dto/staff-attendance.dto';
import { StaffAttendanceService } from './staff-attendance.service';

@ApiTags('hr-staff-attendance')
@Controller('hr/staff-attendance')
export class StaffAttendanceController {
  constructor(private readonly service: StaffAttendanceService) {}

  @Roles()
  @Post('clock-in')
  clockIn(@CurrentUser() user: RequestUser) {
    return this.service.clockIn(user);
  }

  @Roles()
  @Post('clock-out')
  clockOut(@CurrentUser() user: RequestUser) {
    return this.service.clockOut(user);
  }

  @Roles()
  @Get('today')
  today(@CurrentUser() user: RequestUser) {
    return this.service.getToday(user);
  }

  @Roles()
  @Get()
  query(
    @Query() dto: QueryStaffAttendanceDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.query(dto, user);
  }
}
