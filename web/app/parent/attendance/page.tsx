import { Users } from 'lucide-react';
import { AttendanceHistoryList } from '@/components/attendance/attendance-history-list';
import { AttendanceSummaryCards } from '@/components/attendance/attendance-summary-cards';
import { PageHeader } from '@/components/dashboard/page-header';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { getAttendanceSummary, getStudentAttendanceHistory } from '@/lib/actions/attendance';
import { apiFetch } from '@/lib/api';
import type { TermDto } from '@/lib/types/academic';
import type { StudentListResponse } from '@/lib/types/students';
import { ChildSwitcher, type ChildOption } from './child-switcher';

export default async function ParentAttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ studentId?: string }>;
}) {
  const params = await searchParams;

  const [childrenRes, currentTerm] = await Promise.all([
    apiFetch<StudentListResponse>('/students'),
    apiFetch<TermDto>('/terms/current'),
  ]);
  const ward = childrenRes.data;

  if (ward.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Attendance" />
        <Empty className="border border-dashed border-border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Users />
            </EmptyMedia>
            <EmptyTitle>No children linked to your account</EmptyTitle>
            <EmptyDescription>Contact the school office if this looks wrong.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  const childOptions: ChildOption[] = ward.map((child) => ({
    id: child.id,
    label: `${child.firstName} ${child.lastName}`,
  }));
  const selectedId = ward.some((c) => c.id === params.studentId) ? params.studentId! : ward[0].id;
  const selectedChild = ward.find((c) => c.id === selectedId)!;

  const [summary, history] = await Promise.all([
    getAttendanceSummary(selectedId, currentTerm.id),
    getStudentAttendanceHistory(selectedId, currentTerm.startDate, currentTerm.endDate),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance"
        description={`${selectedChild.firstName}'s record for the ${currentTerm.name} term.`}
      />
      {ward.length > 1 && <ChildSwitcher options={childOptions} selectedId={selectedId} />}
      <AttendanceSummaryCards summary={summary} />
      <AttendanceHistoryList records={history} />
    </div>
  );
}
