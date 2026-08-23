'use client';

import { Loader2 } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { approveAction, rejectAction } from '@/lib/actions/discipline';
import type { DisciplinaryActionType } from '@/lib/types/discipline';

const ACTION_LABELS: Record<DisciplinaryActionType, string> = {
  WARNING: 'Warning',
  SUSPENSION: 'Suspension',
  EXPULSION: 'Expulsion',
};

/**
 * The deliberate-confirmation step for Suspension/Expulsion sign-off —
 * design system + prompt both call out that this can't be a casual
 * one-click button, so approval is gated behind an explicit
 * "I understand" checkbox, not just a second click.
 */
export function DecideActionDialog({
  incidentId,
  actionId,
  actionType,
  studentName,
  decision,
  trigger,
}: {
  incidentId: string;
  actionId: string;
  actionType: DisciplinaryActionType;
  studentName: string;
  decision: 'approve' | 'reject';
  trigger: React.ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const isApprove = decision === 'approve';
  const isIrreversible = actionType !== 'WARNING';

  async function submit() {
    if (decision === 'reject' && !notes.trim()) {
      toast.error('Explain why this proposed action is being declined.');
      return;
    }
    setIsSaving(true);
    try {
      if (isApprove) {
        await approveAction(incidentId, actionId, {
          decisionNotes: notes.trim() || undefined,
        });
        toast.success(`${ACTION_LABELS[actionType]} approved.`);
      } else {
        await rejectAction(incidentId, actionId, { decisionNotes: notes.trim() });
        toast.success('Proposed action rejected.');
      }
      setOpen(false);
      setAcknowledged(false);
      setNotes('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not record the decision.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={trigger} />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isApprove ? 'Approve' : 'Reject'} {ACTION_LABELS[actionType]}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isApprove ? (
              <>
                This finalizes a <Badge variant="error">{ACTION_LABELS[actionType]}</Badge> for{' '}
                <strong>{studentName}</strong>
                {isIrreversible
                  ? '. This cannot be undone, and the guardian will be notified immediately.'
                  : '.'}
              </>
            ) : (
              <>
                This declines the proposed {ACTION_LABELS[actionType].toLowerCase()} for{' '}
                <strong>{studentName}</strong>. No notification is sent.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3 text-left">
          <div className="space-y-1.5">
            <Label htmlFor="decision-notes">
              {decision === 'reject' ? 'Reason (required)' : 'Notes (optional)'}
            </Label>
            <Textarea
              id="decision-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                decision === 'reject'
                  ? 'Why is this being declined?'
                  : 'Any additional context for the record.'
              }
            />
          </div>

          {isApprove && isIrreversible && (
            <div className="flex items-start gap-2 rounded-lg border border-error-soft bg-error-soft/40 p-3">
              <Checkbox
                id="ack-irreversible"
                checked={acknowledged}
                onCheckedChange={(checked) => setAcknowledged(checked === true)}
              />
              <Label htmlFor="ack-irreversible" className="text-sm font-normal text-error-soft-foreground">
                I understand this {ACTION_LABELS[actionType].toLowerCase()} is final and cannot be
                reversed.
              </Label>
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <Button variant="outline" type="button" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant={isApprove ? 'default' : 'destructive'}
            disabled={isSaving || (isApprove && isIrreversible && !acknowledged)}
            onClick={submit}
          >
            {isSaving ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : isApprove ? (
              `Approve ${ACTION_LABELS[actionType]}`
            ) : (
              'Reject'
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
