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
import {
  CreateHealthLogDto,
  CreateInventoryItemDto,
  LogVisitationDto,
  UpdateInventoryItemDto,
} from './dto/hostel.dto';
import { HostelCareService } from './hostel-care.service';

const MANAGE_ROLES = ['HOSTEL_WARDEN', 'ADMIN'] as const;

@ApiTags('hostel')
@Controller('hostel')
export class HostelCareController {
  constructor(private readonly hostelCareService: HostelCareService) {}

  // --- Visitation ---

  @Roles(...MANAGE_ROLES)
  @Post('visitations')
  @ApiOperation({ summary: "Log a boarder's visitor" })
  logVisitation(
    @Body() dto: LogVisitationDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.hostelCareService.logVisitation(dto, user);
  }

  @Roles(...MANAGE_ROLES)
  @Get('visitations')
  @ApiQuery({ name: 'studentId', required: false })
  @ApiOperation({
    summary: 'Visitation history, optionally filtered by student',
  })
  listVisitations(@Query('studentId') studentId?: string) {
    return this.hostelCareService.listVisitations(studentId);
  }

  // --- Inventory ---

  @Roles(...MANAGE_ROLES)
  @Post('inventory')
  @ApiOperation({ summary: 'Add an inventory item (per room or per boarder)' })
  createInventoryItem(@Body() dto: CreateInventoryItemDto) {
    return this.hostelCareService.createInventoryItem(dto);
  }

  @Roles(...MANAGE_ROLES)
  @Patch('inventory/:id')
  @ApiOperation({
    summary: 'Update an inventory item — typically its condition',
  })
  updateInventoryItem(
    @Param('id') id: string,
    @Body() dto: UpdateInventoryItemDto,
  ) {
    return this.hostelCareService.updateInventoryItem(id, dto);
  }

  @Roles(...MANAGE_ROLES)
  @Get('inventory')
  @ApiQuery({ name: 'roomId', required: false })
  @ApiQuery({ name: 'studentId', required: false })
  @ApiOperation({ summary: 'Inventory list, filterable by room or boarder' })
  listInventory(
    @Query('roomId') roomId?: string,
    @Query('studentId') studentId?: string,
  ) {
    return this.hostelCareService.listInventory(roomId, studentId);
  }

  // --- Boarder health log ---

  @Roles(...MANAGE_ROLES)
  @Post('health-logs')
  @ApiOperation({
    summary:
      'Log an after-hours/weekend boarder health incident — narrowly scoped, not a general medical-records system',
  })
  createHealthLog(
    @Body() dto: CreateHealthLogDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.hostelCareService.createHealthLog(dto, user);
  }

  @Roles(...MANAGE_ROLES)
  @Get('health-logs')
  @ApiQuery({ name: 'studentId', required: false })
  @ApiOperation({ summary: 'Boarder health log history' })
  listHealthLogs(@Query('studentId') studentId?: string) {
    return this.hostelCareService.listHealthLogs(studentId);
  }
}
