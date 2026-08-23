import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { RequestUser } from '../../common/types/auth.types';
import {
  InitiateOffboardingDto,
  UpdateOffboardingDto,
} from './dto/offboarding.dto';
import { OffboardingService } from './offboarding.service';

@ApiTags('hr-offboarding')
@Controller('hr/offboarding')
export class OffboardingController {
  constructor(private readonly service: OffboardingService) {}

  @Roles('HR_OFFICER', 'ADMIN')
  @Post()
  initiate(
    @Body() dto: InitiateOffboardingDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.initiate(dto, user);
  }

  @Roles('HR_OFFICER', 'ADMIN')
  @Get()
  list() {
    return this.service.list();
  }

  @Roles('HR_OFFICER', 'ADMIN')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateOffboardingDto) {
    return this.service.update(id, dto);
  }

  @Roles('HR_OFFICER', 'ADMIN')
  @Patch(':id/complete')
  complete(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.service.complete(id, user);
  }
}
