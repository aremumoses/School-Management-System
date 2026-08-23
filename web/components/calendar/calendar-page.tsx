import { auth } from '@/auth';
import { PageHeader } from '@/components/dashboard/page-header';
import { CalendarShell } from '@/components/calendar/calendar-shell';
import { getCalendar } from '@/lib/actions/calendar';
import { dateKey, getMonthMatrix, gridRange } from '@/lib/calendar-grid';
import { todayInSchoolTimezone } from '@/lib/school-date';

/** Shared by every `/[role]/calendar` route — docs §2 gives every role at least view access, so the page itself only varies by title/description; access control to the segment is handled upstream by requireDashboardAccess. */
export async function CalendarPage({
  title = 'Calendar',
  description = 'Term dates, holidays, and school events.',
}: {
  title?: string;
  description?: string;
}) {
  const session = await auth();
  const roles = session!.user.roles;
  const userType = session!.user.userType;

  const canManage = roles.includes('ADMIN') || roles.includes('VICE_PRINCIPAL');
  const canRsvp = userType !== 'STUDENT';
  const isStaff = userType === 'STAFF';
  const isUnscopedRsvpViewer = canManage;

  const today = todayInSchoolTimezone();
  const [ty, tm] = today.split('-').map(Number);
  const year = ty;
  const month = tm - 1;

  const weeks = getMonthMatrix(year, month);
  const range = gridRange(weeks);
  const entries = await getCalendar(dateKey(range.from), dateKey(range.to));

  return (
    <div className="space-y-6">
      <PageHeader title={title} description={description} />
      <CalendarShell
        initialYear={year}
        initialMonth={month}
        initialEntries={entries}
        canManage={canManage}
        canRsvp={canRsvp}
        isStaff={isStaff}
        isUnscopedRsvpViewer={isUnscopedRsvpViewer}
        viewerStaffId={isStaff ? session!.user.id : undefined}
      />
    </div>
  );
}
