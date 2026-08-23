import { Module } from '@nestjs/common';
import { BroadcastsController } from './broadcasts.controller';
import { BroadcastsService } from './broadcasts.service';
import { ClassScopeService } from './class-scope.service';
import { ConversationsController } from './conversations.controller';
import { ConversationsService } from './conversations.service';
import { FeeRemindersController } from './fee-reminders.controller';
import { FeeRemindersService } from './fee-reminders.service';
import { MessageTemplatesController } from './message-templates.controller';
import { MessageTemplatesService } from './message-templates.service';
import { NoticesController } from './notices.controller';
import { NoticesService } from './notices.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { EmailService } from './providers/email.service';
import { PushProviderService } from './providers/push.service';
import { SmsService } from './providers/sms.service';
import { WhatsAppProviderService } from './providers/whatsapp.service';
import { PushSubscriptionsController } from './push-subscriptions.controller';
import { PushSubscriptionsService } from './push-subscriptions.service';
import { UssdController } from './ussd.controller';
import { UssdService } from './ussd.service';
import { WhatsAppWebhookController } from './whatsapp-webhook.controller';

@Module({
  controllers: [
    NoticesController,
    MessageTemplatesController,
    BroadcastsController,
    ConversationsController,
    FeeRemindersController,
    NotificationsController,
    PushSubscriptionsController,
    WhatsAppWebhookController,
    UssdController,
  ],
  providers: [
    SmsService,
    EmailService,
    WhatsAppProviderService,
    PushProviderService,
    ClassScopeService,
    NoticesService,
    MessageTemplatesService,
    BroadcastsService,
    ConversationsService,
    FeeRemindersService,
    NotificationsService,
    PushSubscriptionsService,
    UssdService,
  ],
  // BroadcastsService: consumed by AttendanceModule's absence listener
  // (sendAbsenceAlert) and Stage 9's DisciplineModule (sendDisciplineAlert).
  // ClassScopeService: the "is this within my own class?" check Stage 7
  // built for broadcast/conversation targeting is the identical rule
  // docs/03-roles-and-permissions.md §2 uses for a Class/Subject Teacher's
  // "own class" Discipline scope — reused as-is rather than reimplemented.
  exports: [BroadcastsService, ClassScopeService],
})
export class CommunicationModule {}
