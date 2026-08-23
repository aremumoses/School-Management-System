import { Body, Controller, Delete, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { RequestUser } from '../../common/types/auth.types';
import {
  SubscribePushDto,
  UnsubscribePushDto,
} from './dto/push-subscription.dto';
import { PushSubscriptionsService } from './push-subscriptions.service';

@ApiTags('push')
@Controller('push')
export class PushSubscriptionsController {
  constructor(private readonly service: PushSubscriptionsService) {}

  @Roles()
  @Post('subscribe')
  subscribe(@Body() dto: SubscribePushDto, @CurrentUser() user: RequestUser) {
    return this.service.subscribe(dto, user);
  }

  @Roles()
  @Delete('subscribe')
  unsubscribe(@Body() dto: UnsubscribePushDto) {
    return this.service.unsubscribe(dto);
  }
}
