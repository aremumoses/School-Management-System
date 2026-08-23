import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { RequestUser } from '../../common/types/auth.types';
import { MarkTransportAttendanceDto } from './dto/transport.dto';
import { TransportAttendanceService } from './transport-attendance.service';

const MANAGE_ROLES = ['TRANSPORT_OFFICER', 'ADMIN'] as const;

@ApiTags('transport')
@Controller('transport/attendance')
export class TransportAttendanceController {
  constructor(private readonly attendanceService: TransportAttendanceService) {}

  // Literal 'reconciliation' declared before the plain GET so it can never
  // be misread as a query — not actually ambiguous here since this GET
  // takes no path param, but kept first for readability/consistency with
  // the rest of this stage's controllers.
  @Roles(...MANAGE_ROLES)
  @Get('reconciliation')
  @ApiQuery({ name: 'date', required: true })
  @ApiOperation({
    summary:
      "Students marked present in class but who never boarded their assigned bus's pickup run that day",
  })
  getReconciliation(@Query('date') date: string) {
    return this.attendanceService.getReconciliation(date);
  }

  @Roles(...MANAGE_ROLES)
  @Get()
  @ApiQuery({ name: 'routeId', required: true })
  @ApiQuery({ name: 'date', required: true })
  @ApiQuery({ name: 'run', required: true, enum: ['PICKUP', 'DROPOFF'] })
  @ApiOperation({
    summary:
      "A route's assigned students for the given date/run, with existing marks if any",
  })
  get(
    @Query('routeId') routeId: string,
    @Query('date') date: string,
    @Query('run') run: 'PICKUP' | 'DROPOFF',
  ) {
    return this.attendanceService.getAttendance(routeId, date, run);
  }

  @Roles(...MANAGE_ROLES)
  @Post()
  @ApiOperation({
    summary:
      'Bulk-mark boarding for a route/run — a PICKUP no-show immediately alerts the parent',
  })
  mark(
    @Body() dto: MarkTransportAttendanceDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.attendanceService.mark(dto, user);
  }
}
