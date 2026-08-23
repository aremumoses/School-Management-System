import { ActionStatusBadge, SeverityBadge } from '@/components/discipline/severity-badge';
import { DecideActionDialog } from '@/components/discipline/decide-action-dialog';
import { ProposeActionForm } from '@/components/discipline/propose-action-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { IncidentWithActionsDto } from '@/lib/types/discipline';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function IncidentDetail({
  incident,
  studentName,
  canProposeAction,
  canApprove,
}: {
  incident: IncidentWithActionsDto;
  studentName: string;
  canProposeAction: boolean;
  canApprove: boolean;
}) {
  const hasPendingAction = incident.actions.some((a) => a.status === 'PROPOSED');

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>{studentName}</CardTitle>
            <SeverityBadge severity={incident.severity} />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-foreground">{incident.description}</p>
          <p className="text-xs text-muted-foreground">
            Incident date: {formatDate(incident.date)} &middot; Logged{' '}
            {formatDateTime(incident.createdAt)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Disciplinary Actions</CardTitle>
        </CardHeader>
        <CardContent>
          {incident.actions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No action has been proposed yet.</p>
          ) : (
            <ul className="space-y-3">
              {incident.actions.map((action) => (
                <li key={action.id} className="rounded-lg border border-border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">
                        {action.actionType === 'WARNING'
                          ? 'Warning'
                          : action.actionType === 'SUSPENSION'
                            ? 'Suspension'
                            : 'Expulsion'}
                      </span>
                      <ActionStatusBadge status={action.status} />
                    </div>
                    {canApprove && action.status === 'PROPOSED' && action.actionType !== 'WARNING' && (
                      <div className="flex gap-2">
                        <DecideActionDialog
                          incidentId={incident.id}
                          actionId={action.id}
                          actionType={action.actionType}
                          studentName={studentName}
                          decision="reject"
                          trigger={
                            <Button variant="outline" size="sm">
                              Reject
                            </Button>
                          }
                        />
                        <DecideActionDialog
                          incidentId={incident.id}
                          actionId={action.id}
                          actionType={action.actionType}
                          studentName={studentName}
                          decision="approve"
                          trigger={<Button size="sm">Review &amp; Approve</Button>}
                        />
                      </div>
                    )}
                  </div>
                  {action.decisionNotes && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      &ldquo;{action.decisionNotes}&rdquo;
                    </p>
                  )}
                  {action.decidedAt && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Decided {formatDateTime(action.decidedAt)}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {canProposeAction && !hasPendingAction && <ProposeActionForm incidentId={incident.id} />}
    </div>
  );
}
