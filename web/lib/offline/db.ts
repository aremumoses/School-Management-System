import Dexie, { type EntityTable } from 'dexie';
import type { AttendanceStatus } from '@/lib/types/attendance';

/**
 * IndexedDB queue for the two offline-first screens named in
 * docs/18-technical-architecture.md §7 (attendance, CA score entry) — via
 * Dexie.js, per the doc's own suggested library. `key` is each table's
 * primary key (not an auto-increment id) so a repeated write for the same
 * logical target (same student/context/date, or same class/subject/term)
 * naturally overwrites the pending entry via `put()` instead of
 * accumulating duplicate queued items — this is what guarantees "no
 * duplicate submissions if the form is submitted twice while still
 * offline" without any extra dedupe logic.
 */
export interface QueuedAttendanceWrite {
  key: string;
  armId: string;
  classSubjectId?: string;
  date: string;
  entries: { studentId: string; status: AttendanceStatus }[];
  queuedAt: number;
}

export interface QueuedScoreSubmission {
  key: string;
  classSubjectId: string;
  termId: string;
  entries: { studentId: string; assessmentComponentId: string; score: number }[];
  queuedAt: number;
}

export const offlineDb = new Dexie('sms-offline-queue') as Dexie & {
  attendanceQueue: EntityTable<QueuedAttendanceWrite, 'key'>;
  scoreQueue: EntityTable<QueuedScoreSubmission, 'key'>;
};

offlineDb.version(1).stores({
  attendanceQueue: 'key',
  scoreQueue: 'key',
});
