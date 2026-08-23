import {
  AlertTriangle,
  CalendarClock,
  DoorOpen,
  UserCheck,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { PageHeader } from '@/components/dashboard/page-header';
import { StatCard } from '@/components/dashboard/stat-card';
import { Card, CardContent } from '@/components/ui/card';
import { getFrontDeskOverview, listPickupRequests } from '@/lib/actions/front-desk';

export default async function FrontDeskHomePage() {
  const [overview, requests] = await Promise.all([
    getFrontDeskOverview(),
    listPickupRequests(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gate Overview"
        description="Today at the gate — who's in, who's out, what needs attention."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Visitors Today"
          value={overview.visitorCount}
          description={`${overview.currentlySignedIn} currently signed in`}
          icon={Users}
        />
        <StatCard
          label="Out on Gate Pass"
          value={overview.studentsOutOnGatePass}
          icon={DoorOpen}
        />
        <StatCard
          label="Late Arrivals"
          value={overview.lateArrivalCount}
          icon={CalendarClock}
          variant={overview.lateArrivalCount > 0 ? 'warning' : 'default'}
        />
        <StatCard
          label="Escalated Passes"
          value={overview.escalatedGatePasses}
          description="Awaiting Admin resolution"
          icon={AlertTriangle}
          variant={overview.escalatedGatePasses > 0 ? 'error' : 'default'}
        />
      </div>

      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <UserCheck className="size-4 text-muted-foreground" aria-hidden="true" />
              <p className="text-sm font-medium text-foreground">
                Pending early-pickup requests ({overview.pendingPickupRequests})
              </p>
            </div>
            <Link
              href="/front-desk/gate-pass"
              className="text-xs font-medium text-primary hover:underline"
            >
              Issue gate pass →
            </Link>
          </div>
          {requests.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              No parents have called ahead today.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-border rounded-lg border border-border">
              {requests.slice(0, 6).map((request) => (
                <li key={request.id} className="px-4 py-2.5">
                  <p className="text-sm font-medium text-foreground">
                    {request.student.firstName} {request.student.lastName}
                    <span className="ml-2 font-mono text-xs text-muted-foreground">
                      {request.student.admissionNumber}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {request.reason} · expected{' '}
                    {new Date(request.pickupTime).toLocaleString('en-GB', {
                      hour: '2-digit',
                      minute: '2-digit',
                      day: 'numeric',
                      month: 'short',
                    })}
                    {request.guardian &&
                      ` · ${request.guardian.firstName} ${request.guardian.lastName}${request.guardian.phone ? ` (${request.guardian.phone})` : ''}`}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
