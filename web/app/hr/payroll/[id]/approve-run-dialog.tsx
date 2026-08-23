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
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { approvePayrollRun } from '@/lib/actions/hr';

/**
 * Deliberate-confirmation gate for payroll approval — same weight as
 * Stage 9's irreversible discipline-action sign-off: this generates real
 * payslip PDFs and unlocks the bank-payment-schedule export, so it can't be
 * a casual one-click button.
 */
export function ApproveRunDialog({
  runId,
  staffCount,
  periodLabel,
}: {
  runId: string;
  staffCount: number;
  periodLabel: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  async function handleApprove() {
    setIsSaving(true);
    try {
      await approvePayrollRun(runId);
      toast.success('Payroll approved — generating payslip PDFs now.');
      setOpen(false);
      setAcknowledged(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't approve this payroll run.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={<Button />}>Approve Payroll</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Approve payroll for {periodLabel}?</AlertDialogTitle>
          <AlertDialogDescription>
            This generates real payslip PDFs for all {staffCount} staff in this run and unlocks
            the bank payment schedule export. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex items-start gap-2 rounded-lg border border-error-soft bg-error-soft/40 p-3 text-left">
          <Checkbox
            id="ack-payroll-approve"
            checked={acknowledged}
            onCheckedChange={(checked) => setAcknowledged(checked === true)}
          />
          <Label htmlFor="ack-payroll-approve" className="text-sm font-normal text-error-soft-foreground">
            I&apos;ve reviewed the numbers below and confirm this payroll run is correct.
          </Label>
        </div>

        <AlertDialogFooter>
          <Button variant="outline" type="button" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={isSaving || !acknowledged} onClick={() => void handleApprove()}>
            {isSaving ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              'Approve Payroll'
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
