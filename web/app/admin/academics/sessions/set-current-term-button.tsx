'use client';

import { useState, useTransition } from 'react';
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
import { setCurrentTerm } from '@/lib/actions/sessions';
import type { TermDto } from '@/lib/types/academic';

export function SetCurrentTermButton({
  term,
  sessionName,
}: {
  term: TermDto;
  sessionName: string;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (term.isCurrent) {
    return null;
  }

  function confirm() {
    startTransition(async () => {
      try {
        await setCurrentTerm(term.id);
        toast.success(`${term.name} term (${sessionName}) is now the current term.`);
        setOpen(false);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to set current term.');
      }
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={<Button variant="outline" size="sm" />}>
        Set as current
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Set {term.name} Term as current?</AlertDialogTitle>
          <AlertDialogDescription>
            This changes the current term for the entire school — attendance, scores, and fee
            tracking will all default to {term.name} Term ({sessionName}) from now on. Any other
            term marked current will be unset.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction disabled={isPending} onClick={confirm}>
            {isPending ? 'Setting…' : 'Set as Current'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
