'use client';

import { Download, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';

/** Polls until the offer letter PDF is generated, same pattern as documents-table.tsx. */
export function OfferLetterStatus({ url }: { url: string | null }) {
  const router = useRouter();
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (url) return; // already done
    let attempts = 0;
    pollRef.current = setInterval(() => {
      attempts++;
      router.refresh();
      if (attempts >= 20 && pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    }, 3000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [url, router]);

  if (!url) {
    return (
      <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
        Generating offer letter…
      </span>
    );
  }

  return (
    <Button
      size="sm"
      variant="outline"
      render={<a href={url} target="_blank" rel="noreferrer" />}
    >
      <Download className="size-3.5" aria-hidden="true" />
      Download Offer Letter
    </Button>
  );
}
