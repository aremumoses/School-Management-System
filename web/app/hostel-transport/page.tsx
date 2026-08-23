import { PageHeader } from '@/components/dashboard/page-header';
import {
  getRollCall,
  getTransportAttendance,
  listHostels,
  listRoutes,
} from '@/lib/actions/hostel-transport';
import { todayInSchoolTimezone } from '@/lib/school-date';
import { OverviewView } from './overview-view';

export default async function HostelTransportOverviewPage() {
  const [hostels, routes] = await Promise.all([listHostels(), listRoutes()]);
  const today = todayInSchoolTimezone();

  const [rollCallStatus, runStatus] = await Promise.all([
    Promise.all(
      hostels.map(async (hostel) => {
        const [morning, evening] = await Promise.all([
          getRollCall(hostel.id, today, 'MORNING'),
          getRollCall(hostel.id, today, 'EVENING'),
        ]);
        return {
          hostelId: hostel.id,
          hostelName: hostel.name,
          morningMarked: morning.id !== null,
          eveningMarked: evening.id !== null,
          morningUnapproved: morning.entries.filter((e) => e.unapprovedAbsence).length,
          eveningUnapproved: evening.entries.filter((e) => e.unapprovedAbsence).length,
        };
      }),
    ),
    Promise.all(
      routes.map(async (route) => {
        const [pickup, dropoff] = await Promise.all([
          getTransportAttendance(route.id, today, 'PICKUP'),
          getTransportAttendance(route.id, today, 'DROPOFF'),
        ]);
        return {
          routeId: route.id,
          routeName: route.name,
          riderCount: route._count.studentAssignments,
          pickupMarked: pickup.id !== null,
          dropoffMarked: dropoff.id !== null,
        };
      }),
    ),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hostel & Transport Overview"
        description={`Occupancy, today's (${today}) roll-call status, and today's bus run status.`}
      />
      <OverviewView
        hostels={hostels}
        rollCallStatus={rollCallStatus}
        runStatus={runStatus}
      />
    </div>
  );
}
