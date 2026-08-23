import { PageHeader } from '@/components/dashboard/page-header';
import { getTransportAttendance, listRoutes } from '@/lib/actions/hostel-transport';
import { todayInSchoolTimezone } from '@/lib/school-date';
import type { TransportRun } from '@/lib/types/hostel-transport';
import { PickupAttendanceMarker } from './pickup-attendance-marker';

export default async function PickupAttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ routeId?: string; date?: string; run?: string }>;
}) {
  const params = await searchParams;
  const routes = await listRoutes();
  const routeId = params.routeId ?? routes[0]?.id ?? '';
  const date = params.date ?? todayInSchoolTimezone();
  const run: TransportRun = params.run === 'DROPOFF' ? 'DROPOFF' : 'PICKUP';

  const attendance = routeId ? await getTransportAttendance(routeId, date, run) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pickup/Drop Attendance"
        description="Defaults to boarded — tap to flag a no-show. A pickup no-show alerts the parent immediately."
      />
      <PickupAttendanceMarker
        routes={routes.map((r) => ({ id: r.id, name: r.name }))}
        routeId={routeId}
        date={date}
        run={run}
        initialAttendance={attendance}
      />
    </div>
  );
}
