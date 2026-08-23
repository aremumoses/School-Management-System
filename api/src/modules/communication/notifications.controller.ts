import { Controller, Get, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { RequestUser } from '../../common/types/auth.types';
import { NotificationsService } from './notifications.service';

@ApiTags('Communication — Notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // Any logged-in user (staff, parent, or student) has their own bell.
  @Roles()
  @Get('summary')
  getSummary(@CurrentUser() user: RequestUser) {
    return this.notificationsService.getSummary(user);
  }

  @Roles()
  @Post('mark-all-read')
  markAllRead(@CurrentUser() user: RequestUser) {
    return this.notificationsService.markAllRead(user);
  }
}
