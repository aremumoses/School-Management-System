import { AttendanceHistoryList } from '@/components/attendance/attendance-history-list';
import { AttendanceSummaryCards } from '@/components/attendance/attendance-summary-cards';
import type { AttendanceRecordDto, AttendanceSummaryDto } from '@/lib/types/attendance';

/**
 * Everything an Admin needs to check on one student's attendance in a
 * single view — the "click a student, see what they attended and what
 * they missed, all at once" lookup, rather than only being able to check
 * one day at a time via the Class Register. Data is fetched by the
 * (server) page component, not here — this file is rendered inside the
 * 'use client' StudentProfileTabs, which can't await a Server Component.
 */
export function AttendanceTab({
  termName,
  summary,
  history,
}: {
  termName: string;
  summary: AttendanceSummaryDto;
  history: AttendanceRecordDto[];
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {termName} term — {history.length} day{history.length === 1 ? '' : 's'} recorded.
      </p>
      <AttendanceSummaryCards summary={summary} />
      <AttendanceHistoryList records={history} />
    </div>
  );
}
