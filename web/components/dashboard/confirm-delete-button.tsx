'use client';

import { Trash2 } from 'lucide-react';
import { type ReactElement, useState, useTransition } from 'react';
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

/** Shared destructive-action confirmation, used for every delete/remove button across the admin setup screens. */
export function ConfirmDeleteButton({
  itemLabel,
  description,
  onConfirm,
  triggerRender,
}: {
  itemLabel: string;
  description?: string;
  onConfirm: () => Promise<void>;
  triggerRender?: ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      try {
        await onConfirm();
        setOpen(false);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : `Failed to delete ${itemLabel}.`);
      }
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          triggerRender ?? (
            <Button variant="ghost" size="icon-sm" aria-label={`Delete ${itemLabel}`} />
          )
        }
      >
        {!triggerRender && <Trash2 className="size-4 text-destructive" />}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {itemLabel}?</AlertDialogTitle>
          <AlertDialogDescription>
            {description ?? "This can't be undone."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" disabled={isPending} onClick={handleConfirm}>
            {isPending ? 'Deleting…' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
