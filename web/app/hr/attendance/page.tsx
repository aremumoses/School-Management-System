import { ClipboardList } from 'lucide-react';
import { PageHeader } from '@/components/dashboard/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getTodayAttendance, queryStaffAttendance } from '@/lib/actions/hr';
import { todayInSchoolTimezone } from '@/lib/school-date';
import { AttendanceReport } from './attendance-report';
import { ClockWidget } from './clock-widget';

function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export default async function StaffAttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { from, to } = await searchParams;
  const resolvedFrom = from ?? daysAgo(30);
  const resolvedTo = to ?? todayInSchoolTimezone();

  const [today, records] = await Promise.all([
    getTodayAttendance(),
    queryStaffAttendance({ from: resolvedFrom, to: resolvedTo }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Staff Attendance"
        description="Clock in/out and review the staff attendance report — separate from student attendance."
      />

      <ClockWidget today={today} />

      <Card>
        <CardContent className="pt-6">
          <form className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="from">From</Label>
              <Input id="from" name="from" type="date" defaultValue={resolvedFrom} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="to">To</Label>
              <Input id="to" name="to" type="date" defaultValue={resolvedTo} />
            </div>
            <Button type="submit" variant="outline">
              Filter
            </Button>
          </form>
        </CardContent>
      </Card>

      {records.length === 0 ? (
        <Empty className="border border-dashed border-border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ClipboardList />
            </EmptyMedia>
            <EmptyTitle>No attendance records</EmptyTitle>
            <EmptyDescription>No staff clock-ins fall within this date range.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <AttendanceReport records={records} />
      )}
    </div>
  );
}
