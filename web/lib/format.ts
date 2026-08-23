const NAIRA_FORMATTER = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  currencyDisplay: 'narrowSymbol',
});

/** ₦125,000.00 — prompts/00-DESIGN-SYSTEM.md's NGN formatting rule, used everywhere an amount is displayed. */
export function formatNaira(amount: number): string {
  return NAIRA_FORMATTER.format(amount);
}

const RELATIVE_TIME_FORMATTER = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
const RELATIVE_TIME_UNITS: { unit: Intl.RelativeTimeFormatUnit; seconds: number }[] = [
  { unit: 'year', seconds: 31536000 },
  { unit: 'month', seconds: 2592000 },
  { unit: 'week', seconds: 604800 },
  { unit: 'day', seconds: 86400 },
  { unit: 'hour', seconds: 3600 },
  { unit: 'minute', seconds: 60 },
];

/** "3h ago", "yesterday", "2 weeks ago" — used by the notification bell, notice board, and message threads. */
export function formatRelativeTime(isoDate: string): string {
  const diffSeconds = (new Date(isoDate).getTime() - Date.now()) / 1000;
  for (const { unit, seconds } of RELATIVE_TIME_UNITS) {
    if (Math.abs(diffSeconds) >= seconds) {
      return RELATIVE_TIME_FORMATTER.format(Math.round(diffSeconds / seconds), unit);
    }
  }
  return RELATIVE_TIME_FORMATTER.format(Math.round(diffSeconds / 60) || 0, 'minute');
}

/** "9 Jul, 14:32" — the incident/case-log timestamp format shared by Front Desk, exam malpractice, and HR disciplinary logs. */
export function formatLoggedAt(isoDate: string): string {
  return new Date(isoDate).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
