'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { signOffAppraisal } from '@/lib/actions/appraisal';

export function SignOffButton({ submissionId }: { submissionId: string }) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);

  async function handleSignOff() {
    setIsSaving(true);
    try {
      await signOffAppraisal(submissionId);
      toast.success('Appraisal signed off.');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't sign this off.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Button size="sm" onClick={() => void handleSignOff()} disabled={isSaving}>
      {isSaving ? 'Signing off…' : 'Sign Off'}
    </Button>
  );
}
