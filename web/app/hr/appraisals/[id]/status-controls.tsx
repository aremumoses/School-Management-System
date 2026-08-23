'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { updateAppraisalCycleStatus } from '@/lib/actions/appraisal';
import type { AppraisalCycleStatus } from '@/lib/types/appraisal';

export function StatusControls({
  cycleId,
  status,
}: {
  cycleId: string;
  status: AppraisalCycleStatus;
}) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);

  async function transition(next: 'ACTIVE' | 'CLOSED') {
    setIsSaving(true);
    try {
      await updateAppraisalCycleStatus(cycleId, { status: next });
      toast.success(`Cycle marked ${next.toLowerCase()}.`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't update this cycle.");
    } finally {
      setIsSaving(false);
    }
  }

  if (status === 'DRAFT') {
    return (
      <Button onClick={() => void transition('ACTIVE')} disabled={isSaving}>
        Activate Cycle
      </Button>
    );
  }
  if (status === 'ACTIVE') {
    return (
      <Button variant="outline" onClick={() => void transition('CLOSED')} disabled={isSaving}>
        Close Cycle
      </Button>
    );
  }
  return null;
}
