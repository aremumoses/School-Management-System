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
import { completeOffboarding } from '@/lib/actions/hr';

/**
 * Deliberate-confirmation gate — same weight as payroll approval. Explicit
 * about the one thing this is truly irreversible about: it deactivates the
 * staff member's login immediately.
 */
export function CompleteOffboardingDialog({
  checklistId,
  staffName,
  disabled = false,
}: {
  checklistId: string;
  staffName: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  async function handleComplete() {
    setIsSaving(true);
    try {
      await completeOffboarding(checklistId);
      toast.success(`${staffName}'s offboarding is complete — their login is now deactivated.`);
      setOpen(false);
      setAcknowledged(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't complete offboarding.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={<Button disabled={disabled} />}>
        Complete Offboarding
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Complete offboarding for {staffName}?</AlertDialogTitle>
          <AlertDialogDescription>
            This immediately deactivates {staffName}&apos;s staff login and revokes all active
            sessions. This cannot be undone from here — reactivation is a separate Admin action.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex items-start gap-2 rounded-lg border border-error-soft bg-error-soft/40 p-3 text-left">
          <Checkbox
            id="ack-offboarding-complete"
            checked={acknowledged}
            onCheckedChange={(checked) => setAcknowledged(checked === true)}
          />
          <Label htmlFor="ack-offboarding-complete" className="text-sm font-normal text-error-soft-foreground">
            I understand this deactivates {staffName}&apos;s login immediately.
          </Label>
        </div>

        <AlertDialogFooter>
          <Button variant="outline" type="button" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={isSaving || !acknowledged}
            onClick={() => void handleComplete()}
          >
            {isSaving ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              'Complete Offboarding'
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
