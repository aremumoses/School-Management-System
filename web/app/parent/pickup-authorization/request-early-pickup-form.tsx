'use client';

import { Loader2, Send } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createPickupRequest } from '@/lib/actions/front-desk';
import type { PickupRequestDto } from '@/lib/types/front-desk';

const STATUS_BADGE: Record<string, 'warning' | 'success' | 'outline'> = {
  PENDING: 'warning',
  COMPLETED: 'success',
  CANCELLED: 'outline',
};

export function RequestEarlyPickupForm({
  studentId,
  childName,
  requests,
}: {
  studentId: string;
  childName: string;
  requests: PickupRequestDto[];
}) {
  const router = useRouter();
  const [pickupTime, setPickupTime] = useState('');
  const [reason, setReason] = useState('');
  const [isSending, setIsSending] = useState(false);

  async function handleSubmit() {
    if (!pickupTime) return toast.error('Pick the pickup time.');
    if (!reason.trim()) return toast.error('Give a reason.');
    setIsSending(true);
    try {
      await createPickupRequest(studentId, {
        pickupTime: new Date(pickupTime).toISOString(),
        reason: reason.trim(),
      });
      toast.success('Request sent — the front desk has been queued.');
      setPickupTime('');
      setReason('');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't send the request.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Calling ahead? Submit the pickup time and reason so the front desk expects{' '}
        {childName}&apos;s early exit — the pickup person is still checked against your
        authorized list on arrival.
      </p>

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label htmlFor="pr-time">Pickup time</Label>
          <Input
            id="pr-time"
            type="datetime-local"
            value={pickupTime}
            onChange={(e) => setPickupTime(e.target.value)}
            className="w-56"
          />
        </div>
        <div className="min-w-48 flex-1 space-y-1">
          <Label htmlFor="pr-reason">Reason</Label>
          <Input
            id="pr-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Dental appointment"
          />
        </div>
        <Button size="sm" onClick={() => void handleSubmit()} disabled={isSending}>
          {isSending ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <Send className="size-3.5" aria-hidden="true" />
          )}
          Send Request
        </Button>
      </div>

      {requests.length > 0 && (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {requests.slice(0, 5).map((request) => (
            <li key={request.id} className="flex items-center justify-between px-4 py-2.5">
              <div>
                <p className="text-sm text-foreground">{request.reason}</p>
                <p className="text-xs tabular-nums text-muted-foreground">
                  {new Date(request.pickupTime).toLocaleString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
              <Badge variant={STATUS_BADGE[request.status] ?? 'outline'}>
                {request.status.charAt(0) + request.status.slice(1).toLowerCase()}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
