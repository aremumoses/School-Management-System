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
 * cramming five columns into 375px. Drawn as Akademi's table card, with each
 * scheduled lesson a brand-edged block.
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
      <Empty className="rounded-xl bg-card py-12 dark:ring-1 dark:ring-foreground/10">
        <EmptyHeader>
          <EmptyMedia
            variant="icon"
            className="size-12 rounded-full bg-primary/10 text-primary [&_svg:not([class*='size-'])]:size-5"
          >
            <CalendarOff />
          </EmptyMedia>
          <EmptyTitle className="text-base font-semibold text-heading">No timetable yet</EmptyTitle>
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
      <div className="hidden overflow-hidden rounded-xl bg-card md:block dark:ring-1 dark:ring-foreground/10">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[48rem] table-fixed text-sm">
            <thead>
              <tr className="border-b border-border bg-primary/5">
                <th
                  scope="col"
                  className="w-36 py-3.5 pr-3 pl-6 text-left font-semibold text-primary dark:text-heading"
                >
                  Period
                </th>
                {SCHOOL_DAYS.map((day) => (
                  <th
                    key={day}
                    scope="col"
                    className="py-3.5 pr-2 pl-5 text-left font-semibold text-primary dark:text-heading"
                  >
                    {DAY_LABELS[day]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {periods.map((period) => (
                <tr key={period.id}>
                  <th scope="row" className="py-3 pr-3 pl-6 text-left align-top font-normal">
                    <span className="block font-semibold text-heading">{period.name}</span>
                    <span className="block text-xs tabular-nums text-muted-foreground">
                      {period.startTime} – {period.endTime}
                    </span>
                  </th>
                  {SCHOOL_DAYS.map((day) => {
                    const entry = entryFor(entries, day, period.id);
                    return (
                      <td key={day} className="px-1.5 py-2 align-top last:pr-5">
                        {entry ? (
                          <div className="min-h-14 rounded-lg border-l-4 border-primary bg-primary/10 px-3 py-2 dark:bg-primary/20">
                            <p className="line-clamp-2 text-[13px] leading-snug font-semibold text-heading">
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
                          <span className="flex min-h-14 items-center px-3 text-muted-foreground/60">
                            —
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* <md: day-by-day list */}
      <div className="space-y-4 md:hidden">
        {SCHOOL_DAYS.map((day) => {
          const dayEntries = periods
            .map((period) => ({ period, entry: entryFor(entries, day, period.id) }))
            .filter((slot) => slot.entry);
          return (
            <div
              key={day}
              className="overflow-hidden rounded-xl bg-card dark:ring-1 dark:ring-foreground/10"
            >
              <p className="border-b border-border bg-primary/5 px-4 py-3 text-sm font-semibold text-primary dark:text-heading">
                {DAY_LABELS[day]}
              </p>
              {dayEntries.length === 0 ? (
                <p className="px-4 py-4 text-sm text-muted-foreground">No classes.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {dayEntries.map(({ period, entry }) => {
                    const details = [showArm ? entry!.armLabel : null, entry!.room]
                      .filter(Boolean)
                      .join(' · ');
                    return (
                      <li key={period.id} className="flex items-center gap-3 px-4 py-3">
                        <div className="w-20 shrink-0">
                          <p className="text-xs font-semibold text-heading">{period.name}</p>
                          <p className="text-[11px] tabular-nums text-muted-foreground">
                            {period.startTime}–{period.endTime}
                          </p>
                        </div>
                        <div className="min-w-0 border-l-4 border-primary pl-3">
                          <p className="truncate text-sm font-semibold text-heading">
                            {entry!.subjectName}
                          </p>
                          {details && (
                            <p className="truncate text-xs text-muted-foreground">{details}</p>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
