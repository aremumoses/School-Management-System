'use client';

import * as Sentry from '@sentry/nextjs';
import { ServerCrash } from 'lucide-react';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Root error boundary — catches anything an API call or render throws
 * (e.g. the backend being unreachable) so it shows this instead of Next's
 * default crash overlay. Can't reliably distinguish "API down" from other
 * errors here (error objects lose their class across the server/client
 * boundary), so this one friendly message covers the general case.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Report to Sentry — the backend exception filter already does this for
    // server-side API errors; this catches client-side rendering errors that
    // the backend never sees (e.g. a hydration mismatch or a null-deref in
    // a component). No PII: just the error itself and its digest (the
    // opaque Next.js error ID that cross-references the server log).
    Sentry.captureException(error, { tags: { digest: error.digest } });
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-1 items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm text-center">
        <CardHeader>
          <ServerCrash className="mx-auto size-10 text-muted-foreground" aria-hidden="true" />
          <CardTitle className="mt-2">We can&apos;t reach the server right now</CardTitle>
          <CardDescription>
            This is usually temporary. Check your connection and try again in a moment.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => reset()} className="w-full">
            Try again
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
