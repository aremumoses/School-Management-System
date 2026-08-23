// Clock helpers for the CBT exam screen. Kept out of components so the
// React Compiler never sees Date.now() inside render.

export function deadlineFromSeconds(remainingSeconds: number): number {
  return Date.now() + remainingSeconds * 1000;
}

export function secondsUntil(deadlineMs: number): number {
  return Math.max(0, Math.round((deadlineMs - Date.now()) / 1000));
}

export function formatCountdown(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}
