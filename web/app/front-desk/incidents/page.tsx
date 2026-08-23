import { Download, ShieldAlert } from 'lucide-react';
import { PageHeader } from '@/components/dashboard/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { listFacilityIncidents } from '@/lib/actions/front-desk';
import { formatLoggedAt } from '@/lib/format';
import type { FacilityIncidentType } from '@/lib/types/front-desk';
import { LogIncidentForm } from './log-incident-form';

export const INCIDENT_TYPE_LABELS: Record<FacilityIncidentType, string> = {
  UNAUTHORIZED_ENTRY: 'Unauthorized Entry',
  ALTERCATION: 'Altercation',
  LOST_ITEM: 'Lost Item',
  OTHER: 'Other',
};

export default async function FacilityIncidentsPage() {
  const incidents = await listFacilityIncidents();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Incident Log"
        description="Security-relevant events at the gate or on the premises — separate from student discipline."
        action={
          <Button variant="outline" size="sm" render={<a href="/api/front-desk-exports/incidents" download />}>
            <Download className="size-4" aria-hidden="true" />
            Export Excel
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Log an Incident</CardTitle>
        </CardHeader>
        <CardContent>
          <LogIncidentForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Log ({incidents.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {incidents.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <ShieldAlert />
                </EmptyMedia>
                <EmptyTitle>No incidents logged</EmptyTitle>
                <EmptyDescription>
                  Security-relevant events at the gate or on the premises will appear here.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <ul className="divide-y divide-border">
              {incidents.map((incident) => (
                <li key={incident.id} className="space-y-1 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="outline">{INCIDENT_TYPE_LABELS[incident.type]}</Badge>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {formatLoggedAt(incident.loggedAt)}
                    </span>
                  </div>
                  <p className="text-sm text-foreground">{incident.description}</p>
                  {incident.partiesInvolved && (
                    <p className="text-xs text-muted-foreground">
                      Parties: {incident.partiesInvolved}
                    </p>
                  )}
                  {incident.actionTaken && (
                    <p className="text-xs text-muted-foreground">
                      Action: {incident.actionTaken}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Logged by {incident.loggedBy.firstName} {incident.loggedBy.lastName}
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
