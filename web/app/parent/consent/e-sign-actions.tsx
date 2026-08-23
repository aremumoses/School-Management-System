'use client';

import { Check, Loader2, X } from 'lucide-react';
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
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { respondToConsentForm } from '@/lib/actions/clubs';
import type { ConsentResponseValue } from '@/lib/types/clubs';

/**
 * Deliberate-confirmation e-signature: the parent must type their full
 * name before Consent/Decline goes through — these are medical/excursion
 * permissions, not a casual single click.
 */
export function ESignActions({
  formId,
  formTitle,
  studentId,
  studentName,
  changeMode = false,
}: {
  formId: string;
  formTitle: string;
  studentId: string;
  studentName: string;
  /** Already responded — offer a low-key "change response" entry point. */
  changeMode?: boolean;
}) {
  const router = useRouter();
  const [decision, setDecision] = useState<ConsentResponseValue | null>(null);
  const [signature, setSignature] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  async function handleConfirm() {
    if (!decision) return;
    if (signature.trim().length < 3) {
      toast.error('Type your full name as the e-signature.');
      return;
    }
    setIsSaving(true);
    try {
      await respondToConsentForm(formId, {
        studentId,
        response: decision,
        signatureName: signature.trim(),
      });
      toast.success(
        decision === 'CONSENTED' ? 'Consent recorded — thank you.' : 'Response recorded.',
      );
      setDecision(null);
      setSignature('');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't record your response.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      {changeMode ? (
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => setDecision('CONSENTED')}>
            Change to Consent
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setDecision('DECLINED')}>
            Change to Decline
          </Button>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button size="sm" onClick={() => setDecision('CONSENTED')}>
            <Check className="size-3.5" aria-hidden="true" />
            Consent
          </Button>
          <Button size="sm" variant="outline" onClick={() => setDecision('DECLINED')}>
            <X className="size-3.5" aria-hidden="true" />
            Decline
          </Button>
        </div>
      )}

      <AlertDialog open={decision !== null} onOpenChange={(open) => !open && setDecision(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {decision === 'CONSENTED' ? 'Give consent?' : 'Decline consent?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              “{formTitle}” — for {studentName}. Typing your full name below acts as your
              electronic signature and is recorded with a timestamp.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-1.5">
            <Label htmlFor={`sig-${formId}`}>Your full name (e-signature)</Label>
            <Input
              id={`sig-${formId}`}
              value={signature}
              onChange={(e) => setSignature(e.target.value)}
              placeholder="e.g. Ngozi Okafor"
              autoComplete="name"
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant={decision === 'DECLINED' ? 'destructive' : undefined}
              disabled={isSaving || signature.trim().length < 3}
              onClick={() => void handleConfirm()}
            >
              {isSaving ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  Signing…
                </>
              ) : decision === 'CONSENTED' ? (
                'Sign & Consent'
              ) : (
                'Sign & Decline'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
