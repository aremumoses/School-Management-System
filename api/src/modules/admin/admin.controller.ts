import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { AdminService } from './admin.service';

@ApiTags('admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Roles('ADMIN', 'VICE_PRINCIPAL')
  @Get('dashboard-summary')
  @ApiOperation({
    summary:
      'KPI cards for the Admin home — students, staff, attendance, fees, results, discipline, events',
  })
  getDashboardSummary() {
    return this.adminService.getDashboardSummary();
  }
}
