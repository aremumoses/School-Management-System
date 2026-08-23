'use client';

import { CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { markPayrollRunReviewed } from '@/lib/actions/hr';

export function MarkReviewedButton({ runId }: { runId: string }) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);

  async function handleClick() {
    setIsSaving(true);
    try {
      await markPayrollRunReviewed(runId);
      toast.success('Marked as reviewed — you can now approve this run.');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't mark this run reviewed.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Button variant="outline" onClick={() => void handleClick()} disabled={isSaving}>
      <CheckCircle2 className="size-4" aria-hidden="true" />
      {isSaving ? 'Marking…' : 'Mark as Reviewed'}
    </Button>
  );
}
