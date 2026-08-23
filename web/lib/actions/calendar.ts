'use server';

import { revalidatePath } from 'next/cache';
import { apiFetch } from '@/lib/api';
import type {
  CalendarEntryDto,
  CreateEventInput,
  EventDto,
  EventRsvpRespondentDto,
  EventWithTallyDto,
  RsvpInput,
  UpdateEventInput,
} from '@/lib/types/calendar';

/** No RSVP tally here — that's only computed per-event by GET /events/:id (see getEvent). */
export async function listEvents(category?: string): Promise<EventDto[]> {
  const query = category ? `?category=${encodeURIComponent(category)}` : '';
  return apiFetch<EventDto[]>(`/events${query}`);
}

export async function getEvent(id: string): Promise<EventWithTallyDto> {
  return apiFetch<EventWithTallyDto>(`/events/${id}`);
}

export async function getEventRsvps(id: string): Promise<EventRsvpRespondentDto[]> {
  return apiFetch<EventRsvpRespondentDto[]>(`/events/${id}/rsvps`);
}

export async function createEvent(input: CreateEventInput) {
  const event = await apiFetch(`/events`, { method: 'POST', body: JSON.stringify(input) });
  revalidatePath('/admin/calendar');
  return event;
}

export async function updateEvent(id: string, input: UpdateEventInput) {
  const event = await apiFetch(`/events/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  revalidatePath('/admin/calendar');
  return event;
}

export async function deleteEvent(id: string): Promise<void> {
  await apiFetch<void>(`/events/${id}`, { method: 'DELETE' });
  revalidatePath('/admin/calendar');
}

export async function rsvpToEvent(id: string, input: RsvpInput) {
  return apiFetch(`/events/${id}/rsvp`, { method: 'POST', body: JSON.stringify(input) });
}

export async function getCalendar(from: string, to: string): Promise<CalendarEntryDto[]> {
  return apiFetch<CalendarEntryDto[]>(
    `/calendar?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
  );
}
