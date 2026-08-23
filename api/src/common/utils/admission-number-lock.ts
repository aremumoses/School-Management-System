/**
 * Shared Postgres advisory-lock key for admission-number generation.
 * Both students.service.ts's createStudent and bulk-import.service.ts's
 * per-row commit generate the next {year}{sequence} admission number by
 * reading the current max and incrementing it in application code — with
 * no DB-level locking, two concurrent callers (one of each, or two of the
 * same) can read the same max and collide on Student.admissionNumber's
 * unique constraint. Verified to actually happen under real concurrency,
 * not just a theoretical race. Acquiring this exact key for the duration
 * of generate+create serializes every caller against every other one,
 * regardless of which code path it came through — a different key per
 * call site would only protect a path against itself.
 */
export const ADMISSION_NUMBER_LOCK_KEY = 8_723_450_1;
