'use client';

import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
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
import { collateResults } from '@/lib/actions/results';

export function CollateButton({ armId, termId }: { armId: string; termId: string }) {
  const router = useRouter();
  const [isCollating, setIsCollating] = useState(false);
  const [open, setOpen] = useState(false);

  async function handleCollate() {
    setIsCollating(true);
    try {
      await collateResults(armId, termId);
      toast.success('Broadsheet collated — sent to the Admin for approval.');
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't collate.");
    } finally {
      setIsCollating(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={<Button size="sm" />}>
        Collate &amp; Send for Approval
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Collate this class&apos;s results?</AlertDialogTitle>
          <AlertDialogDescription>
            This computes positions and averages from the locked scores and moves the class to
            Pending Approval. The Admin takes it from there — publishing is their call.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction disabled={isCollating} onClick={() => void handleCollate()}>
            {isCollating ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Collating…
              </>
            ) : (
              'Collate'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
