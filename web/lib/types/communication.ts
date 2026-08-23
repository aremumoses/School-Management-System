import type { components } from '@/types/api';

/**
 * Request DTOs from the generated OpenAPI types (source of truth: the
 * NestJS DTOs). Response shapes are hand-written against the actual
 * service return types in api/src/modules/communication — Swagger here
 * only annotates request bodies, not responses, same situation as every
 * other lib/types/*.ts file in this app (see lib/types/fees.ts's
 * identical note).
 */
export type CreateNoticeInput = components['schemas']['CreateNoticeDto'];
export type UpdateNoticeInput = components['schemas']['UpdateNoticeDto'];
export type CreateMessageTemplateInput = components['schemas']['CreateMessageTemplateDto'];
export type UpdateMessageTemplateInput = components['schemas']['UpdateMessageTemplateDto'];
export type CreateBroadcastInput = components['schemas']['CreateBroadcastDto'];
export type CreateConversationInput = components['schemas']['CreateConversationDto'];
export type CreateMessageInput = components['schemas']['CreateMessageDto'];

export type BroadcastTargetType = 'CLASS' | 'ROLE' | 'INDIVIDUAL' | 'WHOLE_SCHOOL';
export type RecipientType = 'GUARDIAN' | 'STUDENT' | 'STAFF';
export type BroadcastChannel = 'SMS' | 'EMAIL' | 'WHATSAPP' | 'PUSH';
export type NotificationChannel = BroadcastChannel | 'IN_APP';
export type SenderType = 'STAFF' | 'GUARDIAN' | 'STUDENT';

export interface NoticeDto {
  id: string;
  title: string;
  body: string;
  category: string;
  createdByStaffId: string;
  createdAt: string;
  updatedAt: string;
}

export interface MessageTemplateDto {
  id: string;
  key: string | null;
  name: string;
  body: string;
  createdByStaffId: string;
  createdAt: string;
  updatedAt: string;
}

export interface BroadcastLogDto {
  id: string;
  actorId: string | null;
  actorType: 'STAFF' | 'GUARDIAN' | 'STUDENT' | 'SYSTEM';
  actorRole: string | null;
  targetType: BroadcastTargetType;
  targetId: string | null;
  targetRecipientType: RecipientType | null;
  channels: NotificationChannel[];
  templateId: string | null;
  message: string;
  recipientCount: number;
  createdAt: string;
}

/** `dryRun: true` response — `id` is null, nothing was actually sent. */
export interface BroadcastSendResultDto {
  id: string | null;
  recipientCount: number;
  channels: NotificationChannel[];
  recipients: { recipientType: RecipientType; name: string }[];
}

export interface DeliveryStatusChannelCounts {
  sent: number;
  delivered: number;
  read: number;
  failed: number;
}

export interface DeliveryStatusResultDto {
  broadcastId: string;
  recipientCount: number;
  byChannel: Record<string, DeliveryStatusChannelCounts>;
}

export interface ConversationListItemDto {
  id: string;
  staffName: string;
  /** null for a direct staff↔student thread (Stage 15) */
  guardianName: string | null;
  studentName: string;
  lastMessage: { body: string; senderType: SenderType; createdAt: string } | null;
  unreadCount: number;
  updatedAt: string;
}

/** GET /conversations/teachers — the student-side "new thread" picker. */
export interface MyTeacherDto {
  staffId: string;
  name: string;
  /** "Class Teacher" or a comma-joined subject list */
  label: string;
}

export interface MessageDto {
  id: string;
  conversationId: string;
  senderType: SenderType;
  senderId: string;
  body: string;
  readAt: string | null;
  createdAt: string;
}

export interface ConversationDetailDto {
  id: string;
  staffId: string;
  guardianId: string | null;
  studentId: string;
  staffName: string;
  guardianName: string | null;
  studentName: string;
  createdAt: string;
  updatedAt: string;
  messages: MessageDto[];
}

export interface NotificationItemDto {
  type: 'BROADCAST' | 'MESSAGE';
  id: string;
  conversationId?: string;
  title: string;
  preview: string;
  createdAt: string;
  read: boolean;
}

export interface NotificationSummaryDto {
  unreadCount: number;
  items: NotificationItemDto[];
}
