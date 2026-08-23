'use server';

import { revalidatePath } from 'next/cache';
import { apiFetch } from '@/lib/api';
import type {
  BroadcastLogDto,
  BroadcastSendResultDto,
  ConversationDetailDto,
  ConversationListItemDto,
  CreateBroadcastInput,
  CreateConversationInput,
  CreateMessageInput,
  CreateMessageTemplateInput,
  CreateNoticeInput,
  DeliveryStatusResultDto,
  MessageDto,
  MessageTemplateDto,
  MyTeacherDto,
  NoticeDto,
  NotificationSummaryDto,
  UpdateMessageTemplateInput,
  UpdateNoticeInput,
} from '@/lib/types/communication';

const NOTICES_PATH = '/admin/communication';

// ---------------------------------------------------------------------------
// Notices
// ---------------------------------------------------------------------------

export async function listNotices(category?: string): Promise<NoticeDto[]> {
  const query = category ? `?category=${encodeURIComponent(category)}` : '';
  return apiFetch<NoticeDto[]>(`/notices${query}`);
}

export async function getNotice(id: string): Promise<NoticeDto> {
  return apiFetch<NoticeDto>(`/notices/${id}`);
}

export async function createNotice(input: CreateNoticeInput): Promise<NoticeDto> {
  const notice = await apiFetch<NoticeDto>('/notices', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  revalidatePath(NOTICES_PATH);
  return notice;
}

export async function updateNotice(id: string, input: UpdateNoticeInput): Promise<NoticeDto> {
  const notice = await apiFetch<NoticeDto>(`/notices/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  revalidatePath(NOTICES_PATH);
  return notice;
}

export async function deleteNotice(id: string): Promise<void> {
  await apiFetch<void>(`/notices/${id}`, { method: 'DELETE' });
  revalidatePath(NOTICES_PATH);
}

// ---------------------------------------------------------------------------
// Message Templates
// ---------------------------------------------------------------------------

export async function listMessageTemplates(): Promise<MessageTemplateDto[]> {
  return apiFetch<MessageTemplateDto[]>('/message-templates');
}

export async function createMessageTemplate(
  input: CreateMessageTemplateInput,
): Promise<MessageTemplateDto> {
  const template = await apiFetch<MessageTemplateDto>('/message-templates', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  revalidatePath(NOTICES_PATH);
  return template;
}

export async function updateMessageTemplate(
  id: string,
  input: UpdateMessageTemplateInput,
): Promise<MessageTemplateDto> {
  const template = await apiFetch<MessageTemplateDto>(`/message-templates/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  revalidatePath(NOTICES_PATH);
  return template;
}

export async function deleteMessageTemplate(id: string): Promise<void> {
  await apiFetch<void>(`/message-templates/${id}`, { method: 'DELETE' });
  revalidatePath(NOTICES_PATH);
}

// ---------------------------------------------------------------------------
// Broadcasts
// ---------------------------------------------------------------------------

export async function listBroadcasts(): Promise<BroadcastLogDto[]> {
  return apiFetch<BroadcastLogDto[]>('/broadcast');
}

/**
 * Called twice from the composer — once with `dryRun: true` for the
 * "exactly who will receive it" confirmation step, then again without it
 * to actually send. Same pattern as fees' generateInvoices.
 */
export async function sendBroadcast(
  input: CreateBroadcastInput,
): Promise<BroadcastSendResultDto> {
  const result = await apiFetch<BroadcastSendResultDto>('/broadcast', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  if (!input.dryRun) {
    revalidatePath(NOTICES_PATH);
  }
  return result;
}

export async function getDeliveryStatus(broadcastId: string): Promise<DeliveryStatusResultDto> {
  return apiFetch<DeliveryStatusResultDto>(`/broadcast/${broadcastId}/delivery-status`);
}

export async function markBroadcastRead(broadcastId: string): Promise<void> {
  await apiFetch<void>(`/broadcast/${broadcastId}/read`, { method: 'POST' });
}

// ---------------------------------------------------------------------------
// Conversations
// ---------------------------------------------------------------------------

export async function listConversations(): Promise<ConversationListItemDto[]> {
  return apiFetch<ConversationListItemDto[]>('/conversations');
}

export async function getConversation(id: string): Promise<ConversationDetailDto> {
  return apiFetch<ConversationDetailDto>(`/conversations/${id}`);
}

/** Student-only: the teachers they may start a thread with. */
export async function listMyTeachers(): Promise<MyTeacherDto[]> {
  return apiFetch<MyTeacherDto[]>('/conversations/teachers');
}

export async function createConversation(
  input: CreateConversationInput,
): Promise<ConversationDetailDto> {
  return apiFetch<ConversationDetailDto>('/conversations', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function addMessage(
  conversationId: string,
  input: CreateMessageInput,
): Promise<MessageDto> {
  return apiFetch<MessageDto>(`/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

// ---------------------------------------------------------------------------
// Notifications (the bell)
// ---------------------------------------------------------------------------

export async function getNotificationSummary(): Promise<NotificationSummaryDto> {
  return apiFetch<NotificationSummaryDto>('/notifications/summary');
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiFetch<void>('/notifications/mark-all-read', { method: 'POST' });
}
