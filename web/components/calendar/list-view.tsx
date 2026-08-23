'use client';

import { entryKind, ENTRY_BADGE_VARIANT } from '@/components/calendar/entry-style';
import { Badge } from '@/components/ui/badge';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { dateKey } from '@/lib/calendar-grid';
import { cn } from '@/lib/utils';
import type { CalendarEntryDto } from '@/lib/types/calendar';
import { CalendarDays } from 'lucide-react';

function formatDay(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

/** A simple chronological list — the design system's mobile-first fallback for screens where a month grid is too cramped (§9, 375px primary target). */
export function ListView({
  entries,
  selectedDate,
  onSelectDate,
}: {
  entries: CalendarEntryDto[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
}) {
  const byDay = new Map<string, CalendarEntryDto[]>();
  for (const entry of entries) {
    const start = new Date(entry.startDate);
    const end = entry.endDate ? new Date(entry.endDate) : start;
    const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const last = new Date(end.getFullYear(), end.getMonth(), end.getDate());
    while (cursor <= last) {
      const key = dateKey(cursor);
      const existing = byDay.get(key);
      if (existing) existing.push(entry);
      else byDay.set(key, [entry]);
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  const days = [...byDay.keys()].sort();

  if (days.length === 0) {
    return (
      <Empty className="border border-dashed border-border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CalendarDays />
          </EmptyMedia>
          <EmptyTitle>Nothing this month</EmptyTitle>
          <EmptyDescription>No term dates, holidays, or events.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <ul className="divide-y divide-border rounded-lg border border-border">
      {days.map((day) => (
        <li key={day}>
          <button
            type="button"
            onClick={() => onSelectDate(day)}
            className={cn(
              'flex w-full items-start gap-3 p-3 text-left hover:bg-accent/60',
              day === selectedDate && 'bg-primary/10',
            )}
          >
            <span className="w-16 shrink-0 pt-0.5 text-xs font-medium text-muted-foreground">
              {formatDay(day)}
            </span>
            <div className="flex flex-1 flex-wrap gap-1.5">
              {(byDay.get(day) ?? []).map((entry) => {
                const kind = entryKind(entry);
                return (
                  <Badge key={`${entry.type}-${entry.id}`} variant={ENTRY_BADGE_VARIANT[kind]}>
                    {entry.title}
                  </Badge>
                );
              })}
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}
