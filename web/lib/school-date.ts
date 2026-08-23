/**
 * "Today" in the school's own timezone (West Africa Time, UTC+1, no DST) —
 * not the server's or visitor's timezone. Plain `new Date().toISOString()`
 * is wrong for roughly the first hour of every Nigerian calendar day
 * (00:00–01:00 WAT is still 23:00–00:00 UTC the *previous* day), which
 * would default attendance-marking and the admin dashboard's "today" stat
 * to yesterday's date right when school starts. Shifting by the fixed +1h
 * offset before truncating avoids that.
 *
 * Only used for server-side defaults — the date `<input>` itself is the
 * browser's own local date, already correct for a Nigeria-based user. If
 * this app ever supports schools outside Nigeria, this needs to become a
 * configurable per-school timezone instead of a hardcoded offset.
 */
const WEST_AFRICA_TIME_OFFSET_MS = 60 * 60 * 1000;

export function todayInSchoolTimezone(): string {
  return new Date(Date.now() + WEST_AFRICA_TIME_OFFSET_MS).toISOString().slice(0, 10);
}
