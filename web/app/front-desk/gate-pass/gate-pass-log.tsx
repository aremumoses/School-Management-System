'use client';

import { Check, Loader2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { resolveGatePass } from '@/lib/actions/front-desk';
import type { GatePassDto, GatePassStatus } from '@/lib/types/front-desk';

const STATUS_BADGE: Record<GatePassStatus, 'success' | 'warning' | 'error'> = {
  ISSUED: 'success',
  ESCALATED: 'warning',
  REJECTED: 'error',
};

function ResolveButtons({ passId }: { passId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<'CONFIRM' | 'REJECT' | null>(null);

  async function handle(decision: 'CONFIRM' | 'REJECT') {
    setBusy(decision);
    try {
      await resolveGatePass(passId, decision);
      toast.success(decision === 'CONFIRM' ? 'Pass confirmed and issued.' : 'Pass rejected.');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't resolve the pass.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex gap-1.5">
      <Button size="sm" onClick={() => void handle('CONFIRM')} disabled={busy !== null}>
        {busy === 'CONFIRM' ? (
          <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
        ) : (
          <Check className="size-3.5" aria-hidden="true" />
        )}
        Confirm
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => void handle('REJECT')}
        disabled={busy !== null}
      >
        {busy === 'REJECT' ? (
          <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
        ) : (
          <X className="size-3.5" aria-hidden="true" />
        )}
        Reject
      </Button>
    </div>
  );
}

export function GatePassLog({
  passes,
  isAdmin,
}: {
  passes: GatePassDto[];
  isAdmin: boolean;
}) {
  if (passes.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        No gate passes issued today.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-xs text-muted-foreground">
          <tr>
            <th className="pb-2 font-medium">Student</th>
            <th className="pb-2 font-medium">Pickup Person</th>
            <th className="pb-2 font-medium">Verified</th>
            <th className="pb-2 font-medium">Status</th>
            <th className="pb-2 font-medium">Time</th>
            {isAdmin && <th className="pb-2" aria-label="Resolve" />}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {passes.map((pass) => (
            <tr key={pass.id}>
              <td className="py-2.5">
                <p className="font-medium text-foreground">
                  {pass.student.firstName} {pass.student.lastName}
                </p>
                <p className="font-mono text-xs text-muted-foreground">
                  {pass.student.admissionNumber}
                </p>
              </td>
              <td className="py-2.5">
                <p className="text-foreground">{pass.pickupPersonName}</p>
                {pass.pickupPersonPhone && (
                  <p className="text-xs text-muted-foreground">{pass.pickupPersonPhone}</p>
                )}
              </td>
              <td className="py-2.5">
                {pass.verifiedAgainstAuthorizedList ? (
                  <Badge variant="success">On list</Badge>
                ) : (
                  <Badge variant="warning">Not on list</Badge>
                )}
              </td>
              <td className="py-2.5">
                <Badge variant={STATUS_BADGE[pass.status]}>{pass.status}</Badge>
              </td>
              <td className="py-2.5 text-xs tabular-nums text-muted-foreground">
                {new Date(pass.issuedAt).toLocaleTimeString('en-GB', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </td>
              {isAdmin && (
                <td className="py-2.5 text-right">
                  {pass.status === 'ESCALATED' && <ResolveButtons passId={pass.id} />}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
