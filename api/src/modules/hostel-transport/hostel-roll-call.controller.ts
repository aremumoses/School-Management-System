import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { RequestUser } from '../../common/types/auth.types';
import { MarkRollCallDto } from './dto/hostel.dto';
import { HostelRollCallService } from './hostel-roll-call.service';

const VIEW_ROLES = ['HOSTEL_WARDEN', 'ADMIN'] as const;

@ApiTags('hostel')
@Controller('hostel/roll-call')
export class HostelRollCallController {
  constructor(private readonly rollCallService: HostelRollCallService) {}

  @Roles(...VIEW_ROLES)
  @Get()
  @ApiQuery({ name: 'hostelId', required: true })
  @ApiQuery({ name: 'date', required: true })
  @ApiQuery({ name: 'session', required: true, enum: ['MORNING', 'EVENING'] })
  @ApiOperation({
    summary:
      "This hostel's boarders for the given date/session — existing marks if any, unapproved absences flagged live",
  })
  get(
    @Query('hostelId') hostelId: string,
    @Query('date') date: string,
    @Query('session') session: 'MORNING' | 'EVENING',
  ) {
    return this.rollCallService.getRollCall(hostelId, date, session);
  }

  @Roles('HOSTEL_WARDEN')
  @Post()
  @ApiOperation({
    summary:
      'Bulk-mark roll-call for a house — any absence with no approved leave request immediately notifies Admin + the guardian',
  })
  mark(@Body() dto: MarkRollCallDto, @CurrentUser() user: RequestUser) {
    return this.rollCallService.mark(dto, user);
  }
}
