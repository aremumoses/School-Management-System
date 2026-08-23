import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { RequestUser } from '../../common/types/auth.types';
import { CreateVehicleMaintenanceDto } from './dto/transport.dto';
import { VehicleMaintenanceService } from './vehicle-maintenance.service';

const MANAGE_ROLES = ['TRANSPORT_OFFICER', 'ADMIN'] as const;

@ApiTags('transport')
@Controller('transport/maintenance')
export class VehicleMaintenanceController {
  constructor(private readonly maintenanceService: VehicleMaintenanceService) {}

  @Roles(...MANAGE_ROLES)
  @Get('due-soon')
  @ApiOperation({
    summary: 'Buses approaching (or past) their next scheduled service',
  })
  getDueSoon() {
    return this.maintenanceService.getDueSoon();
  }

  @Roles(...MANAGE_ROLES)
  @Get()
  @ApiQuery({ name: 'busIdentifier', required: false })
  @ApiOperation({ summary: 'Vehicle maintenance history' })
  list(@Query('busIdentifier') busIdentifier?: string) {
    return this.maintenanceService.list(busIdentifier);
  }

  @Roles(...MANAGE_ROLES)
  @Post()
  @ApiOperation({ summary: 'Log a maintenance/service record' })
  create(
    @Body() dto: CreateVehicleMaintenanceDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.maintenanceService.create(dto, user);
  }
}
