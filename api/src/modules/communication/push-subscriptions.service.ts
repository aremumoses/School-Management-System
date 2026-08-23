import { Injectable } from '@nestjs/common';
import type { Prisma, PushSubscription, UserType } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { RequestUser } from '../../common/types/auth.types';
import {
  SubscribePushDto,
  UnsubscribePushDto,
} from './dto/push-subscription.dto';

@Injectable()
export class PushSubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Upsert on the endpoint (unique per browser/device) — re-subscribing (e.g. after clearing site data) replaces the stale row rather than accumulating dead ones. */
  async subscribe(
    dto: SubscribePushDto,
    user: RequestUser,
  ): Promise<PushSubscription> {
    const subscription = dto as unknown as Prisma.InputJsonValue;
    return this.prisma.pushSubscription.upsert({
      where: { endpoint: dto.endpoint },
      update: { userId: user.id, userType: user.userType, subscription },
      create: {
        userId: user.id,
        userType: user.userType,
        endpoint: dto.endpoint,
        subscription,
      },
    });
  }

  async unsubscribe(dto: UnsubscribePushDto): Promise<void> {
    await this.prisma.pushSubscription.deleteMany({
      where: { endpoint: dto.endpoint },
    });
  }

  listForUser(userId: string, userType: UserType): Promise<PushSubscription[]> {
    return this.prisma.pushSubscription.findMany({
      where: { userId, userType },
    });
  }
}
