import { CalendarDays, Clock, Gavel, type LucideIcon } from 'lucide-react';
import { ActionStatusBadge, SeverityBadge } from '@/components/discipline/severity-badge';
import { DecideActionDialog } from '@/components/discipline/decide-action-dialog';
import { ProposeActionForm } from '@/components/discipline/propose-action-form';
import { Button } from '@/components/ui/button';
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

/** A key fact beside a brand-coral icon circle, as on the profile hero. */
function Fact({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-coral text-brand-foreground">
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className="truncate text-sm font-semibold text-heading">{value}</dd>
      </div>
    </div>
  );
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
  const actionCount = incident.actions.length;

  return (
    <div className="space-y-6">
      <section className="rounded-xl bg-card p-5 sm:p-6 dark:ring-1 dark:ring-foreground/10">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold text-heading">{studentName}</h2>
          <SeverityBadge severity={incident.severity} />
        </div>
        <p className="mt-3 text-sm leading-relaxed whitespace-pre-wrap text-foreground">
          {incident.description}
        </p>
        <dl className="mt-5 grid gap-4 border-t border-border pt-5 sm:grid-cols-2">
          <Fact icon={CalendarDays} label="Incident date" value={formatDate(incident.date)} />
          <Fact icon={Clock} label="Logged" value={formatDateTime(incident.createdAt)} />
        </dl>
      </section>

      <section className="overflow-hidden rounded-xl bg-card dark:ring-1 dark:ring-foreground/10">
        <div className="flex items-center gap-4 border-b border-border px-5 py-4 sm:px-6">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Gavel className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-heading">Disciplinary Actions</h2>
            <p className="text-sm text-muted-foreground">
              {actionCount === 0
                ? 'None proposed yet'
                : `${actionCount} action${actionCount === 1 ? '' : 's'}`}
            </p>
          </div>
        </div>
        {actionCount === 0 ? (
          <p className="px-5 py-6 text-sm text-muted-foreground sm:px-6">
            No action has been proposed yet.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {incident.actions.map((action) => (
              <li key={action.id} className="space-y-2 px-5 py-4 sm:px-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-heading">
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
                  <p className="rounded-lg bg-muted/60 px-3 py-2 text-sm text-foreground">
                    &ldquo;{action.decisionNotes}&rdquo;
                  </p>
                )}
                {action.decidedAt && (
                  <p className="text-xs text-muted-foreground">
                    Decided {formatDateTime(action.decidedAt)}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {canProposeAction && !hasPendingAction && <ProposeActionForm incidentId={incident.id} />}
    </div>
  );
}
