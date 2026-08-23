'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';

/**
 * Wires the `.dark` class that every token in app/globals.css keys off.
 *
 * `next-themes` was already a dependency but had never been mounted — the
 * dark palette existed in CSS with no way for a user to reach it. Mounted at
 * the root so the choice persists across every dashboard, and set to follow
 * the OS by default (`system`) rather than forcing light, per §11.
 *
 * `disableTransitionOnChange` suppresses the app's own color transitions for
 * the single frame the class flips, otherwise every surface on screen
 * cross-fades at a different rate and the switch looks like a glitch.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
