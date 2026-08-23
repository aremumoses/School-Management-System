import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { RequestUser } from '../../common/types/auth.types';
import { BroadcastsService } from './broadcasts.service';
import { ALL_STAFF_ROLES } from './communication-roles.constants';
import { CreateBroadcastDto } from './dto/broadcast.dto';

@ApiTags('Communication — Broadcasts')
@Controller('broadcast')
export class BroadcastsController {
  constructor(private readonly broadcastsService: BroadcastsService) {}

  @Roles(...ALL_STAFF_ROLES)
  @Get()
  list() {
    return this.broadcastsService.list();
  }

  @Roles(...ALL_STAFF_ROLES)
  @Post()
  send(@Body() dto: CreateBroadcastDto, @CurrentUser() user: RequestUser) {
    return this.broadcastsService.send(dto, user);
  }

  @Roles(...ALL_STAFF_ROLES)
  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.broadcastsService.getOrThrow(id);
  }

  @Roles(...ALL_STAFF_ROLES)
  @Get(':id/delivery-status')
  getDeliveryStatus(@Param('id') id: string) {
    return this.broadcastsService.getDeliveryStatus(id);
  }

  // Any logged-in recipient (staff, parent, or student) can mark their own
  // in-app copy read — not gated to staff like everything else above.
  @Roles()
  @Post(':id/read')
  markRead(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.broadcastsService.markRead(id, user);
  }
}
