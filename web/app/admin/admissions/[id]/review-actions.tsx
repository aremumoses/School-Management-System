'use client';

import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { reviewApplicant } from '@/lib/actions/admissions';
import type { ApplicantStatus } from '@/lib/types/admissions';

export function ReviewActions({
  applicantId,
  currentStatus,
}: {
  applicantId: string;
  currentStatus: ApplicantStatus;
}) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectNotes, setRejectNotes] = useState('');

  if (
    currentStatus === 'APPROVED' ||
    currentStatus === 'REJECTED' ||
    currentStatus === 'CONVERTED'
  ) {
    return null;
  }

  async function moveToReview() {
    setIsPending(true);
    try {
      await reviewApplicant(applicantId, { decision: 'UNDER_REVIEW' });
      toast.success('Moved to Under Review.');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update status.');
    } finally {
      setIsPending(false);
    }
  }

  async function approve() {
    setIsPending(true);
    try {
      await reviewApplicant(applicantId, { decision: 'APPROVED' });
      toast.success('Application approved — offer letter is being generated.');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not approve application.');
    } finally {
      setIsPending(false);
    }
  }

  async function reject() {
    if (!rejectNotes.trim()) {
      toast.error('Please explain why the application is being rejected.');
      return;
    }
    setIsPending(true);
    try {
      await reviewApplicant(applicantId, {
        decision: 'REJECTED',
        reviewerNotes: rejectNotes.trim(),
      });
      toast.success('Application rejected.');
      setRejectOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not reject application.');
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {currentStatus === 'SUBMITTED' && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={() => void moveToReview()}
        >
          {isPending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : 'Mark Under Review'}
        </Button>
      )}
      <Button
        type="button"
        size="sm"
        disabled={isPending}
        onClick={() => void approve()}
      >
        {isPending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : 'Approve'}
      </Button>

      <AlertDialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <AlertDialogTrigger
          render={
            <Button type="button" variant="destructive" size="sm" disabled={isPending} />
          }
        >
          Reject
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject this application?</AlertDialogTitle>
            <AlertDialogDescription>
              The applicant will not receive an offer letter. This action records the
              reason for audit purposes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="reject-notes">Reason (required)</Label>
            <Textarea
              id="reject-notes"
              rows={3}
              value={rejectNotes}
              onChange={(e) => setRejectNotes(e.target.value)}
              placeholder="e.g. Age does not meet the minimum requirement for the applied class."
            />
          </div>
          <AlertDialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setRejectOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isPending || !rejectNotes.trim()}
              onClick={() => void reject()}
            >
              {isPending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : 'Reject Application'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
