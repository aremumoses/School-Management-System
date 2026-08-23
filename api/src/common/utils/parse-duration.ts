const UNIT_MS: Record<string, number> = {
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
};

/**
 * Parses a short duration string like "15m" or "7d" into milliseconds.
 * Supports s/m/h/d suffixes only — the small set this project's env vars
 * actually use (JWT_ACCESS_EXPIRES_IN, JWT_REFRESH_EXPIRES_IN).
 */
export function parseDurationToMs(duration: string): number {
  const match = /^(\d+)(s|m|h|d)$/.exec(duration.trim());
  if (!match) {
    throw new Error(
      `Invalid duration string: "${duration}" (expected e.g. "15m", "7d")`,
    );
  }
  const [, amount, unit] = match;
  return Number(amount) * UNIT_MS[unit];
}
