import { Bell, CalendarCheck, ChevronRight, Users, Wallet } from 'lucide-react';
import Link from 'next/link';
import { auth } from '@/auth';
import { PageHeader } from '@/components/dashboard/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { getStudentAttendanceHistory } from '@/lib/actions/attendance';
import { listNotices } from '@/lib/actions/communication';
import { apiFetch } from '@/lib/api';
import { ATTENDANCE_STATUS_BADGE, ATTENDANCE_STATUS_LABELS } from '@/lib/attendance-status-labels';
import { formatNaira } from '@/lib/format';
import { todayInSchoolTimezone } from '@/lib/school-date';
import type { InvoiceSummaryDto } from '@/lib/types/fees';
import type { StudentListResponse } from '@/lib/types/students';
import { ChildSwitcher } from './fees/child-switcher';

export default async function ParentHomePage({
  searchParams,
}: {
  searchParams: Promise<{ studentId?: string }>;
}) {
  const params = await searchParams;
  const session = await auth();
  const firstName = session?.user.name?.split(' ')[0] ?? 'there';

  const childrenRes = await apiFetch<StudentListResponse>('/students');
  const children = childrenRes.data;

  if (children.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title={`Welcome, ${firstName}`} />
        <Empty className="border border-dashed border-border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Users />
            </EmptyMedia>
            <EmptyTitle>No children linked to your account</EmptyTitle>
            <EmptyDescription>
              Contact the school office if this doesn&apos;t look right.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  const selectedId = children.some((c) => c.id === params.studentId)
    ? params.studentId!
    : children[0].id;
  const child = children.find((c) => c.id === selectedId)!;
  const today = todayInSchoolTimezone();

  const [todayRecords, invoices, notices] = await Promise.all([
    getStudentAttendanceHistory(selectedId, today, today),
    apiFetch<InvoiceSummaryDto[]>(`/invoices?studentId=${selectedId}`),
    listNotices(),
  ]);

  // Whole-day register only — a per-period (subject) record isn't the
  // day's attendance status.
  const dailyRecord = todayRecords.find((r) => r.classSubjectId === null);
  const totalBalance = invoices.reduce((sum, invoice) => sum + invoice.balance, 0);
  const recentNotices = notices.slice(0, 3);
  const enrollment = child.enrollments[0];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome, ${firstName}`}
        description={`How ${child.firstName} is doing today.`}
      />

      {children.length > 1 && (
        <ChildSwitcher
          options={children.map((c) => ({ id: c.id, label: `${c.firstName} ${c.lastName}` }))}
          selectedId={selectedId}
        />
      )}

      {/* Child summary strip */}
      <Card>
        <CardContent className="flex items-center justify-between gap-3 py-4">
          <div className="min-w-0">
            <p className="font-semibold text-foreground">
              {child.firstName} {child.lastName}
            </p>
            <p className="text-xs text-muted-foreground">
              {enrollment
                ? `${enrollment.class.name} ${enrollment.arm.name} · ${child.admissionNumber}`
                : child.admissionNumber}
            </p>
          </div>
          <Link
            href={`/parent/results?studentId=${selectedId}`}
            className="flex shrink-0 items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            Results
            <ChevronRight className="size-4" aria-hidden="true" />
          </Link>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Today's attendance */}
        <Card className="rounded-2xl">
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Today&apos;s Attendance
            </CardTitle>
            <CalendarCheck className="size-4 text-muted-foreground" aria-hidden="true" />
          </CardHeader>
          <CardContent className="space-y-2">
            {dailyRecord ? (
              <Badge variant={ATTENDANCE_STATUS_BADGE[dailyRecord.status]} className="text-sm">
                {ATTENDANCE_STATUS_LABELS[dailyRecord.status]}
              </Badge>
            ) : (
              <p className="text-sm text-muted-foreground">Not marked yet today.</p>
            )}
            <Link
              href={`/parent/attendance?studentId=${selectedId}`}
              className="block text-xs font-medium text-primary hover:underline"
            >
              Full attendance history →
            </Link>
          </CardContent>
        </Card>

        {/* Fee balance */}
        <Card className="rounded-2xl">
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Fee Balance
            </CardTitle>
            <Wallet className="size-4 text-muted-foreground" aria-hidden="true" />
          </CardHeader>
          <CardContent className="space-y-2">
            <p
              className={`text-2xl font-bold tabular-nums ${
                totalBalance > 0 ? 'text-foreground' : 'text-success-soft-foreground'
              }`}
            >
              {formatNaira(totalBalance)}
            </p>
            {totalBalance > 0 ? (
              <Button size="sm" render={<Link href={`/parent/fees?studentId=${selectedId}`} />}>
                Pay Now
              </Button>
            ) : (
              <p className="text-xs text-muted-foreground">All settled — nothing outstanding.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent notices */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Recent Notices</CardTitle>
          <Link
            href="/parent/notices"
            className="text-xs font-medium text-primary hover:underline"
          >
            All notices →
          </Link>
        </CardHeader>
        <CardContent>
          {recentNotices.length === 0 ? (
            <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
              <Bell className="size-4" aria-hidden="true" />
              No notices from the school yet.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {recentNotices.map((notice) => (
                <li key={notice.id} className="py-2.5">
                  <p className="text-sm font-medium text-foreground">{notice.title}</p>
                  <p className="line-clamp-2 text-xs text-muted-foreground">{notice.body}</p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
