import { PageHeader } from '@/components/dashboard/page-header';
import { listBooks, listReservations } from '@/lib/actions/library';
import { ReservationsView } from './reservations-view';

export default async function ReservationsPage() {
  const [reservations, books] = await Promise.all([listReservations(), listBooks()]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reservations"
        description="Members waiting on a checked-out title — auto-notified the moment it's returned."
      />
      <ReservationsView reservations={reservations} books={books} />
    </div>
  );
}
