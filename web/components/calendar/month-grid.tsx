'use client';

import { entryKind, ENTRY_DOT_CLASS } from '@/components/calendar/entry-style';
import { Button } from '@/components/ui/button';
import { bucketEntriesByDay, dateKey, getMonthMatrix, gridRange, WEEKDAY_LABELS } from '@/lib/calendar-grid';
import { todayInSchoolTimezone } from '@/lib/school-date';
import { cn } from '@/lib/utils';
import type { CalendarEntryDto } from '@/lib/types/calendar';

export function MonthGrid({
  year,
  month,
  entries,
  selectedDate,
  onSelectDate,
}: {
  year: number;
  month: number;
  entries: CalendarEntryDto[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
}) {
  const weeks = getMonthMatrix(year, month);
  const range = gridRange(weeks);
  const byDay = bucketEntriesByDay(entries, range);
  const today = todayInSchoolTimezone();

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="grid grid-cols-7 border-b border-border bg-muted/40">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="p-2 text-center text-xs font-medium text-muted-foreground">
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {weeks.flatMap((week) =>
          week.map((day) => {
            const key = dateKey(day);
            const dayEntries = byDay.get(key) ?? [];
            const inMonth = day.getMonth() === month;
            const isToday = key === today;
            const isSelected = key === selectedDate;
            const kinds = [...new Set(dayEntries.map(entryKind))];

            return (
              <Button
                key={key}
                type="button"
                variant="ghost"
                onClick={() => onSelectDate(key)}
                className={cn(
                  'h-auto min-h-16 flex-col items-start justify-start gap-1 rounded-none border-b border-r border-border p-2 text-left last:border-r-0',
                  !inMonth && 'bg-muted/20 text-muted-foreground/60',
                  isSelected && 'bg-primary/10 ring-1 ring-inset ring-primary',
                )}
              >
                <span
                  className={cn(
                    'flex size-6 items-center justify-center rounded-full text-xs tabular-nums',
                    isToday && 'bg-primary text-primary-foreground font-semibold',
                  )}
                >
                  {day.getDate()}
                </span>
                {kinds.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {kinds.map((kind) => (
                      <span
                        key={kind}
                        className={cn('size-1.5 rounded-full', ENTRY_DOT_CLASS[kind])}
                        aria-hidden="true"
                      />
                    ))}
                  </div>
                )}
              </Button>
            );
          }),
        )}
      </div>
    </div>
  );
}
