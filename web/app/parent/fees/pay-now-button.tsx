'use client';

import { Check, Loader2 } from 'lucide-react';
import Script from 'next/script';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { checkout, getInvoice } from '@/lib/actions/fees';
import { formatNaira } from '@/lib/format';

declare global {
  interface Window {
    // Loaded by the <Script> below — Paystack's Inline JS widget.
    // resumeTransaction opens the popup for a transaction this app already
    // initialized server-side (via the secret key, in PaystackService), so
    // the amount/email are locked to what the backend computed and no key
    // — public or secret — needs to live in this bundle at all.
    PaystackPop?: {
      resumeTransaction: (accessCode: string) => void;
    };
  }
}

type Phase = 'idle' | 'opening' | 'waiting' | 'confirmed' | 'timed-out';

export function PayNowButton({
  invoiceId,
  fullBalance,
  suggestedAmount,
}: {
  invoiceId: string;
  fullBalance: number;
  suggestedAmount?: number;
}) {
  const router = useRouter();
  const amount = suggestedAmount ?? fullBalance;
  const [phase, setPhase] = useState<Phase>('idle');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [confirmedBalance, setConfirmedBalance] = useState<number | null>(null);

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  // Without this, navigating away mid-poll (e.g. switching to a different
  // child via ChildSwitcher) leaves the interval running against an
  // unmounted component — wasted requests for up to a minute, and state
  // updates firing on a component nothing is listening to anymore.
  useEffect(() => stopPolling, []);

  function startPolling(balanceBefore: number) {
    setPhase('waiting');
    let attempts = 0;
    pollRef.current = setInterval(async () => {
      attempts += 1;
      try {
        const updated = await getInvoice(invoiceId);
        if (updated.balance < balanceBefore) {
          stopPolling();
          setConfirmedBalance(updated.balance);
          setPhase('confirmed');
          router.refresh();
          return;
        }
      } catch {
        // Transient — keep polling until the attempt limit below.
      }
      if (attempts >= 30) {
        stopPolling();
        setPhase('timed-out');
      }
    }, 2000);
  }

  async function handlePayNow() {
    if (!window.PaystackPop) {
      toast.error("Payment isn't ready yet — give the page a second and try again.");
      return;
    }
    setPhase('opening');
    try {
      const result = await checkout({ invoiceId, amount });
      window.PaystackPop.resumeTransaction(result.accessCode);
      startPolling(fullBalance);
    } catch (error) {
      setPhase('idle');
      toast.error(error instanceof Error ? error.message : "Couldn't start checkout.");
    }
  }

  return (
    <>
      {/* Rendered unconditionally regardless of phase — next/script
          dedupes by src globally anyway, but there's no reason to ever
          let this stop rendering while the button might still need it. */}
      <Script src="https://js.paystack.co/v1/inline.js" strategy="afterInteractive" />

      {phase === 'confirmed' ? (
        <div className="flex items-center gap-3 rounded-lg bg-success-soft px-4 py-3 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-success text-white">
            <Check className="size-4" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-semibold text-success-soft-foreground">Payment confirmed</p>
            <p className="text-xs text-success-soft-foreground/80">
              {confirmedBalance && confirmedBalance > 0
                ? `New balance: ${formatNaira(confirmedBalance)}`
                : 'This invoice is now fully paid.'}
            </p>
          </div>
        </div>
      ) : phase === 'waiting' ? (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Waiting for confirmation…
          </span>
          <button
            type="button"
            onClick={() => {
              stopPolling();
              setPhase('idle');
            }}
            className="text-xs text-muted-foreground underline-offset-2 hover:underline"
          >
            Cancel
          </button>
        </div>
      ) : (
        <div className="space-y-1.5">
          <Button size="lg" className="w-full" disabled={phase === 'opening'} onClick={handlePayNow}>
            {phase === 'opening' ? 'Opening checkout…' : `Pay Now — ${formatNaira(amount)}`}
          </Button>
          {phase === 'timed-out' && (
            <p className="text-xs text-warning">
              Still processing — if you completed payment, it&apos;ll appear here shortly. If you closed the checkout, tap Pay Now to try again.
            </p>
          )}
        </div>
      )}
    </>
  );
}
