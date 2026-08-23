import { PageHeader } from '@/components/dashboard/page-header';
import { getRollCall, listHostels } from '@/lib/actions/hostel-transport';
import { todayInSchoolTimezone } from '@/lib/school-date';
import type { RollCallSession } from '@/lib/types/hostel-transport';
import { RollCallMarker } from './roll-call-marker';

export default async function RollCallPage({
  searchParams,
}: {
  searchParams: Promise<{ hostelId?: string; date?: string; session?: string }>;
}) {
  const params = await searchParams;
  const hostels = await listHostels();
  const hostelId = params.hostelId ?? hostels[0]?.id ?? '';
  const date = params.date ?? todayInSchoolTimezone();
  const session: RollCallSession = params.session === 'EVENING' ? 'EVENING' : 'MORNING';

  const rollCall = hostelId ? await getRollCall(hostelId, date, session) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Roll-Call"
        description="Defaults to present — tap to flag an absence. Unapproved absences are flagged immediately and notify Admin + the guardian."
      />
      <RollCallMarker
        hostels={hostels.map((h) => ({ id: h.id, name: h.name }))}
        hostelId={hostelId}
        date={date}
        session={session}
        initialRollCall={rollCall}
      />
    </div>
  );
}
