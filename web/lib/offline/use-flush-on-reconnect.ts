import { useEffect } from 'react';

/**
 * Shared by both offline-first screens (attendance, scores) — attempts a
 * flush once on mount (in case the app was closed while offline and
 * reopened after connectivity returned, so the browser's `online` event
 * never fired) and again on every `online` event. A plain `online`
 * listener, not the Background Sync API — Background Sync has no Safari
 * support at all and inconsistent support elsewhere, so it can't be relied
 * on for a feature that must actually work, per the frontend prompt's own
 * fallback guidance.
 */
export function useFlushOnReconnect(
  flush: () => Promise<number>,
  onFlushed: (count: number) => void,
) {
  useEffect(() => {
    let cancelled = false;

    function attemptFlush() {
      if (!navigator.onLine) return;
      void flush().then((count) => {
        if (!cancelled && count > 0) onFlushed(count);
      });
    }

    const timer = setTimeout(attemptFlush, 0);
    window.addEventListener('online', attemptFlush);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      window.removeEventListener('online', attemptFlush);
    };
  }, [flush, onFlushed]);
}
