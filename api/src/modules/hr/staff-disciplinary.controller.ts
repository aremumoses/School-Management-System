import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { RequestUser } from '../../common/types/auth.types';
import { CreateStaffDisciplinaryRecordDto } from './dto/staff-disciplinary.dto';
import { StaffDisciplinaryService } from './staff-disciplinary.service';

@ApiTags('hr-disciplinary')
@Controller('hr/disciplinary-records')
export class StaffDisciplinaryController {
  constructor(private readonly service: StaffDisciplinaryService) {}

  @Roles('HR_OFFICER', 'ADMIN')
  @Post()
  create(
    @Body() dto: CreateStaffDisciplinaryRecordDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.create(dto, user);
  }

  @Roles('HR_OFFICER', 'ADMIN')
  @Get()
  list(@Query('staffId') staffId?: string) {
    return this.service.list(staffId);
  }
}
