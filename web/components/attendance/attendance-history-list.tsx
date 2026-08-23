import { Badge } from '@/components/ui/badge';
import { Empty, EmptyDescription, EmptyTitle } from '@/components/ui/empty';
import { ATTENDANCE_STATUS_BADGE, ATTENDANCE_STATUS_LABELS } from '@/lib/attendance-status-labels';
import type { AttendanceRecordDto } from '@/lib/types/attendance';

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

/** A compact, reverse-chronological list of daily attendance records — shared by Parent and Student attendance screens. Kept lightweight (a plain list, not a calendar grid) since this is one of the most-opened screens on a slow connection. */
export function AttendanceHistoryList({ records }: { records: AttendanceRecordDto[] }) {
  if (records.length === 0) {
    return (
      <Empty className="border border-dashed border-border">
        <EmptyTitle>No attendance recorded yet</EmptyTitle>
        <EmptyDescription>Records will appear here once a teacher marks attendance.</EmptyDescription>
      </Empty>
    );
  }

  return (
    <ul className="divide-y divide-border rounded-lg border border-border">
      {records.map((record) => (
        <li key={record.id} className="flex items-center justify-between gap-3 px-4 py-3">
          <span className="text-sm text-foreground">{formatDate(record.date)}</span>
          <Badge variant={ATTENDANCE_STATUS_BADGE[record.status]}>
            {ATTENDANCE_STATUS_LABELS[record.status]}
          </Badge>
        </li>
      ))}
    </ul>
  );
}
