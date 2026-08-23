'use client';

import { AlertTriangle, Check, Loader2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { decideLeaveRequest } from '@/lib/actions/hr';
import type { HrLeaveRequestDto } from '@/lib/types/hr';

export function LeaveRequestRow({ request }: { request: HrLeaveRequestDto }) {
  const router = useRouter();
  const [rejecting, setRejecting] = useState(false);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null);

  async function decide(decision: 'APPROVED' | 'REJECTED') {
    if (decision === 'REJECTED' && !notes.trim()) {
      toast.error('Say why so the staff member understands.');
      return;
    }
    setBusy(decision === 'APPROVED' ? 'approve' : 'reject');
    try {
      await decideLeaveRequest(request.id, {
        decision,
        decisionNotes: decision === 'REJECTED' ? notes.trim() : undefined,
      });
      toast.success(decision === 'APPROVED' ? 'Request approved.' : 'Request rejected.');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't save this decision.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card>
      <CardContent className="space-y-3 py-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="font-medium text-foreground">
              {request.staff?.firstName} {request.staff?.lastName}
            </p>
            <p className="text-xs text-muted-foreground">
              {request.leaveType.name} · {new Date(request.fromDate).toLocaleDateString()} –{' '}
              {new Date(request.toDate).toLocaleDateString()}
            </p>
          </div>
          {request.exceedsBalance && <Badge variant="error">Exceeds balance</Badge>}
        </div>
        <p className="text-sm text-foreground">{request.reason}</p>

        {rejecting && (
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Why is this being rejected?"
            rows={2}
          />
        )}

        <div className="flex justify-end gap-2">
          {rejecting ? (
            <>
              <Button variant="outline" size="sm" onClick={() => setRejecting(false)} disabled={busy !== null}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => void decide('REJECTED')}
                disabled={busy !== null}
              >
                {busy === 'reject' ? (
                  <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <AlertTriangle className="size-3.5" aria-hidden="true" />
                )}
                Confirm Reject
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={() => setRejecting(true)} disabled={busy !== null}>
                <X className="size-3.5" aria-hidden="true" />
                Reject
              </Button>
              <Button size="sm" onClick={() => void decide('APPROVED')} disabled={busy !== null}>
                {busy === 'approve' ? (
                  <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <Check className="size-3.5" aria-hidden="true" />
                )}
                Approve
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
