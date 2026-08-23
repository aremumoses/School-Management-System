'use client';

import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
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
import { generateInvoices } from '@/lib/actions/fees';
import { formatNaira } from '@/lib/format';
import type { GenerateInvoicesResponseDto } from '@/lib/types/fees';

export function GenerateInvoicesButton({
  classId,
  termId,
  className,
}: {
  classId: string;
  termId: string;
  className: string;
}) {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<GenerateInvoicesResponseDto | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);

  async function loadPreview() {
    setIsLoadingPreview(true);
    try {
      const result = await generateInvoices({ classId, termId, dryRun: true });
      setPreview(result);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't preview invoices.");
      setOpen(false);
    } finally {
      setIsLoadingPreview(false);
    }
  }

  async function commit() {
    setIsCommitting(true);
    try {
      const result = await generateInvoices({ classId, termId });
      toast.success(`${result.generated} invoice${result.generated === 1 ? '' : 's'} generated for ${className}.`);
      setOpen(false);
      setPreview(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't generate invoices.");
    } finally {
      setIsCommitting(false);
    }
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (isCommitting) return;
        setOpen(next);
        if (next) void loadPreview();
        else setPreview(null);
      }}
    >
      <AlertDialogTrigger render={<Button />}>Generate Invoices for This Class</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Generate invoices for {className}?</AlertDialogTitle>
          <AlertDialogDescription>
            {isLoadingPreview || !preview ? (
              <span className="flex items-center gap-2 py-2">
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Calculating…
              </span>
            ) : preview.generated === 0 ? (
              'Every actively-enrolled student in this class already has an invoice from this fee structure — nothing new to generate.'
            ) : (
              <>
                This will create{' '}
                <strong className="text-foreground">
                  {preview.generated} invoice{preview.generated === 1 ? '' : 's'}
                </strong>{' '}
                totalling{' '}
                <strong className="tabular-nums text-foreground">{formatNaira(preview.totalAmount)}</strong>
                {preview.skipped > 0
                  ? ` (${preview.skipped} student${preview.skipped === 1 ? '' : 's'} already invoiced will be skipped).`
                  : '.'}
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isCommitting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={isLoadingPreview || isCommitting || !preview || preview.generated === 0}
            onClick={commit}
          >
            {isCommitting ? 'Generating…' : 'Confirm & Generate'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
