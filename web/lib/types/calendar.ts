import type { components } from '@/types/api';

export type CreateEventInput = components['schemas']['CreateEventDto'];
export type UpdateEventInput = components['schemas']['UpdateEventDto'];
export type RsvpInput = components['schemas']['RsvpDto'];

export type EventRsvpResponse = 'YES' | 'NO' | 'MAYBE';

export interface EventDto {
  id: string;
  title: string;
  description: string | null;
  category: string;
  startDate: string;
  endDate: string | null;
  rsvpEnabled: boolean;
  createdByStaffId: string;
  createdAt: string;
  updatedAt: string;
}

export interface EventWithTallyDto extends EventDto {
  rsvpTally: { yes: number; no: number; maybe: number };
  myResponse: EventRsvpResponse | null;
}

export interface EventRsvpRespondentDto {
  id: string;
  eventId: string;
  responderType: 'STAFF' | 'GUARDIAN';
  responderId: string;
  response: EventRsvpResponse;
  name: string;
  createdAt: string;
}

export interface CalendarEntryDto {
  type: 'EVENT' | 'TERM';
  id: string;
  title: string;
  startDate: string;
  endDate: string | null;
  category: string | null;
  rsvpEnabled: boolean;
}
