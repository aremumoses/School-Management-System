import { auth } from '@/auth';
import { AttendanceHistoryList } from '@/components/attendance/attendance-history-list';
import { AttendanceSummaryCards } from '@/components/attendance/attendance-summary-cards';
import { PageHeader } from '@/components/dashboard/page-header';
import { getAttendanceSummary, getStudentAttendanceHistory } from '@/lib/actions/attendance';
import { apiFetch } from '@/lib/api';
import type { TermDto } from '@/lib/types/academic';

export default async function StudentAttendancePage() {
  const session = await auth();
  const studentId = session!.user.id;

  const currentTerm = await apiFetch<TermDto>('/terms/current');
  const [summary, history] = await Promise.all([
    getAttendanceSummary(studentId, currentTerm.id),
    getStudentAttendanceHistory(studentId, currentTerm.startDate, currentTerm.endDate),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="Attendance" description={`Your record for the ${currentTerm.name} term.`} />
      <AttendanceSummaryCards summary={summary} />
      <AttendanceHistoryList records={history} />
    </div>
  );
}
