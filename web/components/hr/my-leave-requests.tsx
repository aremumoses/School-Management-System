import { CalendarOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import type { HrLeaveRequestDto, LeaveBalanceDto, LeaveRequestStatus } from '@/lib/types/hr';

const STATUS_BADGE: Record<LeaveRequestStatus, 'warning' | 'success' | 'error'> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'error',
};

/** Shared by /teacher/leave and /hr/leave — balance summary + the staff member's own request history. */
export function MyLeaveRequests({
  balances,
  requests,
}: {
  balances: LeaveBalanceDto[];
  requests: HrLeaveRequestDto[];
}) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Leave Balances ({new Date().getFullYear()})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {balances.map((b) => (
              <div key={b.id} className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground">{b.leaveType?.name}</p>
                <p className="text-lg font-semibold text-foreground">
                  {b.allocatedDays - b.usedDays}{' '}
                  <span className="text-xs font-normal text-muted-foreground">
                    / {b.allocatedDays} days left
                  </span>
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your Requests ({requests.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <CalendarOff />
                </EmptyMedia>
                <EmptyTitle>No requests yet</EmptyTitle>
                <EmptyDescription>Submit a request above.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <ul className="divide-y divide-border">
              {requests.map((r) => (
                <li key={r.id} className="space-y-1 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-foreground">{r.leaveType.name}</p>
                    <div className="flex items-center gap-2">
                      {r.exceedsBalance && (
                        <Badge variant="error">Exceeds balance</Badge>
                      )}
                      <Badge variant={STATUS_BADGE[r.status]}>{r.status}</Badge>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(r.fromDate).toLocaleDateString()} –{' '}
                    {new Date(r.toDate).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-foreground">{r.reason}</p>
                  {r.status === 'REJECTED' && r.decisionNotes && (
                    <p className="text-xs text-error-soft-foreground">Reason: {r.decisionNotes}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
