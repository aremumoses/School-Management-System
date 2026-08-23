'use client';

import { ChevronLeft, ChevronRight, LayoutGrid, List } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { CreateEventDialog } from '@/components/calendar/create-event-dialog';
import { DayPanel } from '@/components/calendar/day-panel';
import { ListView } from '@/components/calendar/list-view';
import { MonthGrid } from '@/components/calendar/month-grid';
import { Button } from '@/components/ui/button';
import { getCalendar } from '@/lib/actions/calendar';
import { dateKey, getMonthMatrix, gridRange, MONTH_NAMES } from '@/lib/calendar-grid';
import { todayInSchoolTimezone } from '@/lib/school-date';
import type { CalendarEntryDto } from '@/lib/types/calendar';

export function CalendarShell({
  initialYear,
  initialMonth,
  initialEntries,
  canManage,
  canRsvp,
  isStaff,
  isUnscopedRsvpViewer,
  viewerStaffId,
}: {
  initialYear: number;
  initialMonth: number;
  initialEntries: CalendarEntryDto[];
  canManage: boolean;
  canRsvp: boolean;
  isStaff: boolean;
  isUnscopedRsvpViewer: boolean;
  viewerStaffId?: string;
}) {
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [entries, setEntries] = useState(initialEntries);
  const [isLoading, setIsLoading] = useState(false);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = todayInSchoolTimezone();
    const [ty, tm] = today.split('-').map(Number);
    return ty === initialYear && tm === initialMonth + 1
      ? today
      : `${initialYear}-${String(initialMonth + 1).padStart(2, '0')}-01`;
  });

  function refresh(y: number, m: number) {
    const weeks = getMonthMatrix(y, m);
    const range = gridRange(weeks);
    setIsLoading(true);
    getCalendar(dateKey(range.from), dateKey(range.to))
      .then(setEntries)
      .catch(() => toast.error("Couldn't load the calendar."))
      .finally(() => setIsLoading(false));
  }

  const isFirstRender = useRef(true);
  useEffect(() => {
    // The server component already fetched initialEntries for this exact
    // month — skip the redundant refetch on mount, only refetch when the
    // user actually navigates to a different month.
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    refresh(year, month);
  }, [year, month]);

  function changeMonth(delta: number) {
    let nextMonth = month + delta;
    let nextYear = year;
    if (nextMonth < 0) {
      nextMonth = 11;
      nextYear -= 1;
    } else if (nextMonth > 11) {
      nextMonth = 0;
      nextYear += 1;
    }
    setYear(nextYear);
    setMonth(nextMonth);
    setSelectedDate(`${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-01`);
  }

  const selectedEntries = entries.filter((entry) => {
    const start = new Date(entry.startDate);
    const end = entry.endDate ? new Date(entry.endDate) : start;
    const [sy, sm, sd] = selectedDate.split('-').map(Number);
    const day = new Date(sy, sm - 1, sd);
    const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
    return day >= startDay && day <= endDay;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon-sm" aria-label="Previous month" onClick={() => changeMonth(-1)}>
            <ChevronLeft className="size-4" aria-hidden="true" />
          </Button>
          <h2 className="min-w-44 text-center text-xl font-semibold text-foreground">
            {MONTH_NAMES[month]} {year}
          </h2>
          <Button variant="outline" size="icon-sm" aria-label="Next month" onClick={() => changeMonth(1)}>
            <ChevronRight className="size-4" aria-hidden="true" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border p-0.5 sm:hidden">
            <Button
              type="button"
              variant={view === 'grid' ? 'secondary' : 'ghost'}
              size="icon-sm"
              aria-label="Grid view"
              onClick={() => setView('grid')}
            >
              <LayoutGrid className="size-4" aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant={view === 'list' ? 'secondary' : 'ghost'}
              size="icon-sm"
              aria-label="List view"
              onClick={() => setView('list')}
            >
              <List className="size-4" aria-hidden="true" />
            </Button>
          </div>
          {canManage && <CreateEventDialog onCreated={() => refresh(year, month)} />}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className={isLoading ? 'opacity-50 transition-opacity' : undefined}>
          <div className={view === 'grid' ? 'block' : 'hidden sm:block'}>
            <MonthGrid
              year={year}
              month={month}
              entries={entries}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
            />
          </div>
          <div className={view === 'list' ? 'block sm:hidden' : 'hidden'}>
            <ListView entries={entries} selectedDate={selectedDate} onSelectDate={setSelectedDate} />
          </div>
        </div>

        <DayPanel
          selectedDate={selectedDate}
          entries={selectedEntries}
          canRsvp={canRsvp}
          canManage={canManage}
          isStaff={isStaff}
          isUnscopedRsvpViewer={isUnscopedRsvpViewer}
          viewerStaffId={viewerStaffId}
          onEventDeleted={() => refresh(year, month)}
        />
      </div>
    </div>
  );
}
