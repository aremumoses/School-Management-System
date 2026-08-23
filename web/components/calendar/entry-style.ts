import type { CalendarEntryDto } from '@/lib/types/calendar';

export type EntryKind = 'term' | 'holiday' | 'event';

export function entryKind(entry: CalendarEntryDto): EntryKind {
  if (entry.type === 'TERM') return 'term';
  if (entry.category?.toLowerCase().includes('holiday')) return 'holiday';
  return 'event';
}

/** One small, fixed palette so a month full of entries never looks cluttered — design system §2's warning/info/secondary tones, reused rather than inventing new colors. */
export const ENTRY_DOT_CLASS: Record<EntryKind, string> = {
  term: 'bg-secondary',
  holiday: 'bg-warning',
  event: 'bg-info',
};

export const ENTRY_BADGE_VARIANT: Record<EntryKind, 'success' | 'warning' | 'info'> = {
  term: 'success',
  holiday: 'warning',
  event: 'info',
};

export const ENTRY_KIND_LABEL: Record<EntryKind, string> = {
  term: 'Term',
  holiday: 'Holiday',
  event: 'Event',
};
