'use client';

import { Check, Loader2, Undo2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { FormFieldLabel } from '@/components/dashboard/form-field-label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { reviewLessonNote } from '@/lib/actions/lesson-notes';

export function ReviewActions({ noteId }: { noteId: string }) {
  const router = useRouter();
  const [isApproving, setIsApproving] = useState(false);
  const [isReturning, setIsReturning] = useState(false);
  const [returnReason, setReturnReason] = useState('');
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);

  async function handleApprove() {
    setIsApproving(true);
    try {
      await reviewLessonNote(noteId, { decision: 'APPROVED' });
      toast.success('Lesson note approved.');
      setApproveDialogOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't approve.");
    } finally {
      setIsApproving(false);
    }
  }

  async function handleReturn() {
    if (!returnReason.trim()) {
      toast.error('A reason is required — the teacher needs to know what to fix.');
      return;
    }
    setIsReturning(true);
    try {
      await reviewLessonNote(noteId, { decision: 'RETURNED', notes: returnReason.trim() });
      toast.success('Returned to the teacher for revision.');
      setReturnDialogOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't return the note.");
    } finally {
      setIsReturning(false);
    }
  }

  return (
    <section className="flex flex-col gap-4 rounded-xl bg-card px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6 dark:ring-1 dark:ring-foreground/10">
      <div className="min-w-0">
        <h2 className="text-lg font-semibold text-heading">Your Review</h2>
        <p className="text-sm text-muted-foreground">
          Approving locks the note for the teacher. Returning it needs a reason they will see.
        </p>
      </div>

      <div className="flex shrink-0 flex-wrap gap-2">
        <AlertDialog open={returnDialogOpen} onOpenChange={setReturnDialogOpen}>
          <AlertDialogTrigger render={<Button variant="outline" />}>
            <Undo2 className="size-4" aria-hidden="true" />
            Return for Revision
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-heading">Return this lesson note?</AlertDialogTitle>
              <AlertDialogDescription>
                Explain what needs fixing — the teacher sees this note and can edit and resubmit.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-2">
              <FormFieldLabel htmlFor="return-reason" required>
                Reason
              </FormFieldLabel>
              <Textarea
                id="return-reason"
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                placeholder="e.g. Add an evaluation section with at least three questions."
                className="min-h-24"
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                disabled={isReturning}
                onClick={() => void handleReturn()}
              >
                {isReturning ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    Returning…
                  </>
                ) : (
                  'Return'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
          <AlertDialogTrigger render={<Button />}>
            <Check className="size-4" aria-hidden="true" />
            Approve
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-heading">Approve this lesson note?</AlertDialogTitle>
              <AlertDialogDescription>
                The teacher will no longer be able to edit it — later changes need a duplicate that
                goes through approval again.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction disabled={isApproving} onClick={() => void handleApprove()}>
                {isApproving ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    Approving…
                  </>
                ) : (
                  'Approve'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </section>
  );
}
