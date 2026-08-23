import { PageHeader } from '@/components/dashboard/page-header';
import { WeekGrid } from '@/components/timetable/week-grid';
import { getMyTimetable } from '@/lib/actions/timetable';

export default async function StudentTimetablePage() {
  // Resolved server-side from the student's current enrollment.
  const grid = await getMyTimetable();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Timetable"
        description={
          grid.armLabel
            ? `Your class schedule — ${grid.armLabel}.`
            : 'Your class schedule appears here once you have an active enrollment.'
        }
      />
      <WeekGrid periods={grid.periods} entries={grid.entries} />
    </div>
  );
}
