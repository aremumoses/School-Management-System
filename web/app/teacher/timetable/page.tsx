import { auth } from '@/auth';
import { PageHeader } from '@/components/dashboard/page-header';
import { WeekGrid } from '@/components/timetable/week-grid';
import { getStaffTimetable } from '@/lib/actions/timetable';

export default async function TeacherTimetablePage() {
  const session = await auth();
  const staffId = session!.user.id;
  const grid = await getStaffTimetable(staffId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Timetable"
        description="Your week across every class you teach — arm, subject, and room per period."
      />
      <WeekGrid periods={grid.periods} entries={grid.entries} showArm />
    </div>
  );
}
