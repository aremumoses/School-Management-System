'use client';

import { useEffect } from 'react';

/** Registers public/sw.js once on mount — mounted in the root layout so it's active app-wide, not just on the two offline-first screens. */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const timer = setTimeout(() => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .catch((error: unknown) => {
          console.error('Service worker registration failed:', error);
        });
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  return null;
}
