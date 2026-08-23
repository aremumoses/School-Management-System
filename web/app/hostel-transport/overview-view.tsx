import { AlertTriangle, BedDouble, Bus, CheckCircle2, Users, XCircle } from 'lucide-react';
import { StatCard } from '@/components/dashboard/stat-card';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import type { HostelDto } from '@/lib/types/hostel-transport';

interface RollCallStatusRow {
  hostelId: string;
  hostelName: string;
  morningMarked: boolean;
  eveningMarked: boolean;
  morningUnapproved: number;
  eveningUnapproved: number;
}

interface RunStatusRow {
  routeId: string;
  routeName: string;
  riderCount: number;
  pickupMarked: boolean;
  dropoffMarked: boolean;
}

function TransportRunSection({ runStatus }: { runStatus: RunStatusRow[] }) {
  if (runStatus.length === 0) {
    return (
      <Empty className="border border-dashed border-border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Bus />
          </EmptyMedia>
          <EmptyTitle>No transport routes set up yet</EmptyTitle>
          <EmptyDescription>Add a route under Routes &amp; Stops to get started.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {runStatus.map((route) => (
        <Card key={route.routeId}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              {route.routeName}
              <span className="text-sm font-normal text-muted-foreground">
                {route.riderCount} rider{route.riderCount === 1 ? '' : 's'}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Today:</span>
              <Badge variant={route.pickupMarked ? 'success' : 'outline'}>
                {route.pickupMarked ? (
                  <CheckCircle2 className="size-3" aria-hidden="true" />
                ) : (
                  <XCircle className="size-3" aria-hidden="true" />
                )}
                Pickup {route.pickupMarked ? 'marked' : 'not marked'}
              </Badge>
              <Badge variant={route.dropoffMarked ? 'success' : 'outline'}>
                {route.dropoffMarked ? (
                  <CheckCircle2 className="size-3" aria-hidden="true" />
                ) : (
                  <XCircle className="size-3" aria-hidden="true" />
                )}
                Drop-off {route.dropoffMarked ? 'marked' : 'not marked'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function OverviewView({
  hostels,
  rollCallStatus,
  runStatus,
}: {
  hostels: HostelDto[];
  rollCallStatus: RollCallStatusRow[];
  runStatus: RunStatusRow[];
}) {
  if (hostels.length === 0) {
    return (
      <div className="space-y-6">
        <Empty className="border border-dashed border-border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BedDouble />
            </EmptyMedia>
            <EmptyTitle>No hostels set up yet</EmptyTitle>
            <EmptyDescription>
              Add a hostel/house under Room &amp; Bed Allocation to get started.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Transport — Today&apos;s Runs</h2>
          <TransportRunSection runStatus={runStatus} />
        </section>
      </div>
    );
  }

  const totalBeds = hostels.reduce(
    (sum, h) => sum + h.rooms.reduce((s, r) => s + r.bedCapacity, 0),
    0,
  );
  const occupiedBeds = hostels.reduce(
    (sum, h) => sum + h.rooms.reduce((s, r) => s + r.bedAllocations.length, 0),
    0,
  );
  const statusByHostel = new Map(rollCallStatus.map((r) => [r.hostelId, r]));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Hostels/Houses" value={hostels.length} icon={BedDouble} variant="default" />
        <StatCard
          label="Beds Occupied"
          value={`${occupiedBeds} / ${totalBeds}`}
          icon={Users}
          variant="info"
        />
        <StatCard
          label="Vacant Beds"
          value={totalBeds - occupiedBeds}
          icon={BedDouble}
          variant={totalBeds - occupiedBeds > 0 ? 'success' : 'warning'}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {hostels.map((hostel) => {
          const capacity = hostel.rooms.reduce((s, r) => s + r.bedCapacity, 0);
          const occupied = hostel.rooms.reduce((s, r) => s + r.bedAllocations.length, 0);
          const status = statusByHostel.get(hostel.id);
          return (
            <Card key={hostel.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-base">
                  {hostel.name}
                  <span className="text-sm font-normal text-muted-foreground">
                    {occupied}/{capacity} beds
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {hostel.warden && (
                  <p className="text-xs text-muted-foreground">
                    Warden: {hostel.warden.firstName} {hostel.warden.lastName}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-xs font-medium text-muted-foreground">Today:</span>
                  {status?.morningMarked ? (
                    <Badge variant={status.morningUnapproved > 0 ? 'error' : 'success'}>
                      {status.morningUnapproved > 0 ? (
                        <AlertTriangle className="size-3" aria-hidden="true" />
                      ) : (
                        <CheckCircle2 className="size-3" aria-hidden="true" />
                      )}
                      Morning{status.morningUnapproved > 0 ? ` — ${status.morningUnapproved} flagged` : ''}
                    </Badge>
                  ) : (
                    <Badge variant="outline">
                      <XCircle className="size-3" aria-hidden="true" />
                      Morning not marked
                    </Badge>
                  )}
                  {status?.eveningMarked ? (
                    <Badge variant={status.eveningUnapproved > 0 ? 'error' : 'success'}>
                      {status.eveningUnapproved > 0 ? (
                        <AlertTriangle className="size-3" aria-hidden="true" />
                      ) : (
                        <CheckCircle2 className="size-3" aria-hidden="true" />
                      )}
                      Evening{status.eveningUnapproved > 0 ? ` — ${status.eveningUnapproved} flagged` : ''}
                    </Badge>
                  ) : (
                    <Badge variant="outline">
                      <XCircle className="size-3" aria-hidden="true" />
                      Evening not marked
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Transport — Today&apos;s Runs</h2>
        <TransportRunSection runStatus={runStatus} />
      </section>
    </div>
  );
}
