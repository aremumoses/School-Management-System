import { CalendarOff } from 'lucide-react';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import type { PeriodDto, TimetableEntryDto } from '@/lib/types/timetable';

export const DAY_LABELS: Record<number, string> = {
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
};
export const SCHOOL_DAYS = [1, 2, 3, 4, 5];

function entryFor(
  entries: TimetableEntryDto[],
  day: number,
  periodId: string,
): TimetableEntryDto | undefined {
  return entries.find((e) => e.dayOfWeek === day && e.periodId === periodId);
}

/**
 * Read-only week timetable, shared by /teacher/timetable and
 * /student/timetable. Design-system §9: ≥md renders the classic
 * period-rows × day-columns grid; below md it collapses to a day-by-day
 * list (same grid-vs-list pattern as Stage 9's Calendar) instead of
 * cramming five columns into 375px.
 */
export function WeekGrid({
  periods,
  entries,
  showArm = false,
}: {
  periods: PeriodDto[];
  entries: TimetableEntryDto[];
  /** Teachers need to see which arm each period is; a student's grid is all one arm. */
  showArm?: boolean;
}) {
  if (periods.length === 0 || entries.length === 0) {
    return (
      <Empty className="border border-dashed border-border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CalendarOff />
          </EmptyMedia>
          <EmptyTitle>No timetable yet</EmptyTitle>
          <EmptyDescription>
            {periods.length === 0
              ? 'The school hasn’t configured its periods yet.'
              : 'Nothing has been scheduled for this term yet.'}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <>
      {/* ≥md: week grid */}
      <div className="hidden overflow-x-auto rounded-lg border border-border md:block">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Period</th>
              {SCHOOL_DAYS.map((day) => (
                <th key={day} className="px-3 py-2 font-medium">
                  {DAY_LABELS[day]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {periods.map((period) => (
              <tr key={period.id}>
                <td className="whitespace-nowrap px-3 py-2 align-top">
                  <p className="font-medium text-foreground">{period.name}</p>
                  <p className="text-xs tabular-nums text-muted-foreground">
                    {period.startTime}–{period.endTime}
                  </p>
                </td>
                {SCHOOL_DAYS.map((day) => {
                  const entry = entryFor(entries, day, period.id);
                  return (
                    <td key={day} className="px-3 py-2 align-top">
                      {entry ? (
                        <div className="rounded-md bg-primary/10 px-2 py-1.5">
                          <p className="text-xs font-medium text-foreground">
                            {entry.subjectName}
                          </p>
                          {showArm && (
                            <p className="text-xs text-muted-foreground">{entry.armLabel}</p>
                          )}
                          {entry.room && (
                            <p className="text-xs text-muted-foreground">{entry.room}</p>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground/50">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* <md: day-by-day list */}
      <div className="space-y-4 md:hidden">
        {SCHOOL_DAYS.map((day) => {
          const dayEntries = periods
            .map((period) => ({ period, entry: entryFor(entries, day, period.id) }))
            .filter((slot) => slot.entry);
          return (
            <div key={day} className="overflow-hidden rounded-lg border border-border">
              <p className="bg-muted/50 px-3 py-2 text-xs font-semibold text-foreground">
                {DAY_LABELS[day]}
              </p>
              {dayEntries.length === 0 ? (
                <p className="px-3 py-3 text-xs text-muted-foreground">No classes.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {dayEntries.map(({ period, entry }) => (
                    <li key={period.id} className="flex items-center gap-3 px-3 py-2.5">
                      <div className="w-20 shrink-0">
                        <p className="text-xs font-medium text-foreground">{period.name}</p>
                        <p className="text-[11px] tabular-nums text-muted-foreground">
                          {period.startTime}–{period.endTime}
                        </p>
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                          {entry!.subjectName}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {[showArm ? entry!.armLabel : null, entry!.room]
                            .filter(Boolean)
                            .join(' · ')}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
