import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { RequestUser } from '../../common/types/auth.types';
import { CreateLeaveRequestDto, DecideLeaveRequestDto } from './dto/hostel.dto';
import { LeaveRequestsService } from './leave-requests.service';

@ApiTags('hostel')
@Controller('hostel/leave-requests')
export class LeaveRequestsController {
  constructor(private readonly leaveRequestsService: LeaveRequestsService) {}

  @Roles('PARENT')
  @Post()
  @ApiOperation({ summary: 'Request boarding leave/outing for your own ward' })
  create(@Body() dto: CreateLeaveRequestDto, @CurrentUser() user: RequestUser) {
    return this.leaveRequestsService.create(dto, user);
  }

  @Roles('PARENT')
  @Get('mine')
  @ApiOperation({
    summary:
      "The logged-in parent's own leave/outing requests, across all their wards",
  })
  mine(@CurrentUser() user: RequestUser) {
    return this.leaveRequestsService.listForGuardian(user.id);
  }

  @Roles('HOSTEL_WARDEN', 'ADMIN')
  @Get()
  @ApiQuery({ name: 'studentId', required: false })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['PENDING', 'APPROVED', 'REJECTED'],
  })
  @ApiOperation({
    summary: 'Leave/outing requests, filterable by student/status',
  })
  list(
    @Query('studentId') studentId?: string,
    @Query('status') status?: 'PENDING' | 'APPROVED' | 'REJECTED',
  ) {
    return this.leaveRequestsService.list(studentId, status);
  }

  @Roles('HOSTEL_WARDEN', 'ADMIN')
  @Patch(':id/decide')
  @ApiOperation({
    summary: 'Approve or reject (with a reason) a leave/outing request',
  })
  decide(
    @Param('id') id: string,
    @Body() dto: DecideLeaveRequestDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.leaveRequestsService.decide(id, dto, user);
  }
}
