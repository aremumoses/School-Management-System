import { CalendarCheck, CalendarX, Clock3 } from 'lucide-react';
import { StatCard } from '@/components/dashboard/stat-card';
import type { AttendanceSummaryDto } from '@/lib/types/attendance';

/** This term's present/absent/late + percentage, as a row of stat cards — shared by Parent and Student attendance screens. */
export function AttendanceSummaryCards({ summary }: { summary: AttendanceSummaryDto }) {
  return (
    <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
      <StatCard
        label="Attendance Rate"
        value={`${summary.percentage}%`}
        icon={CalendarCheck}
        variant={summary.percentage >= 90 ? 'success' : summary.percentage >= 75 ? 'warning' : 'error'}
      />
      <StatCard label="Present" value={summary.PRESENT} icon={CalendarCheck} variant="success" />
      <StatCard label="Absent" value={summary.ABSENT} icon={CalendarX} variant="error" />
      <StatCard label="Late" value={summary.LATE} icon={Clock3} variant="warning" />
    </div>
  );
}
