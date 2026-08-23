import type { CalendarEntryDto } from '@/lib/types/calendar';

export function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;
}

/** Sunday-start week grid for the given month — trims a trailing all-next-month row to avoid the visual clutter of a near-empty 6th row most months don't need. */
export function getMonthMatrix(year: number, month: number): Date[][] {
  const firstOfMonth = new Date(year, month, 1);
  const gridStart = new Date(year, month, 1 - firstOfMonth.getDay());

  const weeks: Date[][] = [];
  const cursor = new Date(gridStart);
  for (let w = 0; w < 6; w++) {
    const week: Date[] = [];
    for (let d = 0; d < 7; d++) {
      week.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }

  const lastWeek = weeks[weeks.length - 1];
  if (lastWeek.every((d) => d.getMonth() !== month)) {
    weeks.pop();
  }
  return weeks;
}

export function gridRange(weeks: Date[][]): { from: Date; to: Date } {
  return { from: weeks[0][0], to: weeks[weeks.length - 1][6] };
}

/** Buckets every entry onto each calendar day it spans (clipped to the grid range) — a multi-day Term or Event shows a dot on every day it covers, not just its start. */
export function bucketEntriesByDay(
  entries: CalendarEntryDto[],
  range: { from: Date; to: Date },
): Map<string, CalendarEntryDto[]> {
  const byDay = new Map<string, CalendarEntryDto[]>();
  for (const entry of entries) {
    const start = new Date(entry.startDate);
    const end = entry.endDate ? new Date(entry.endDate) : start;
    const clippedStart = start < range.from ? range.from : start;
    const clippedEnd = end > range.to ? range.to : end;

    const cursor = new Date(clippedStart.getFullYear(), clippedStart.getMonth(), clippedStart.getDate());
    const last = new Date(clippedEnd.getFullYear(), clippedEnd.getMonth(), clippedEnd.getDate());
    while (cursor <= last) {
      const key = dateKey(cursor);
      const existing = byDay.get(key);
      if (existing) existing.push(entry);
      else byDay.set(key, [entry]);
      cursor.setDate(cursor.getDate() + 1);
    }
  }
  return byDay;
}

export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
