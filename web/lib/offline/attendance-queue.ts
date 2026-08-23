import { markAttendance } from '@/lib/actions/attendance';
import type { AttendanceStatus } from '@/lib/types/attendance';
import { offlineDb, type QueuedAttendanceWrite } from './db';

export type EnqueuedAttendanceWrite = Omit<QueuedAttendanceWrite, 'key' | 'queuedAt'>;

function queueKey(write: EnqueuedAttendanceWrite): string {
  // One queued row per (context, date) — not per student — so repeated
  // taps for different students in the same session/date merge into a
  // single flush-able write, and a resubmission of the *same* student
  // while still offline just overwrites that entry within it (handled by
  // the caller merging entries before calling enqueue — see
  // attendance-marker.tsx).
  return `${write.armId}::${write.classSubjectId ?? ''}::${write.date}`;
}

export async function enqueueAttendanceWrite(write: EnqueuedAttendanceWrite): Promise<void> {
  await offlineDb.attendanceQueue.put({
    ...write,
    key: queueKey(write),
    queuedAt: Date.now(),
  });
}

/** Merges new entries into any already-queued write for the same context/date, so offline taps accumulate into one pending write instead of clobbering each other. */
export async function mergeIntoQueuedAttendanceWrite(
  write: EnqueuedAttendanceWrite,
): Promise<void> {
  const key = queueKey(write);
  const existing = await offlineDb.attendanceQueue.get(key);
  if (!existing) {
    await enqueueAttendanceWrite(write);
    return;
  }
  const byStudent = new Map(existing.entries.map((e) => [e.studentId, e.status]));
  for (const entry of write.entries) {
    byStudent.set(entry.studentId, entry.status);
  }
  await offlineDb.attendanceQueue.put({
    ...existing,
    entries: [...byStudent.entries()].map(([studentId, status]) => ({
      studentId,
      status: status as AttendanceStatus,
    })),
    queuedAt: Date.now(),
  });
}

export async function getQueuedAttendanceCount(): Promise<number> {
  return offlineDb.attendanceQueue.count();
}

/** Attempts to send every queued write to the real endpoint; a write that still fails (still offline, or a real server error) stays queued for the next attempt. Returns how many were successfully flushed. */
export async function flushAttendanceQueue(): Promise<number> {
  const queued = await offlineDb.attendanceQueue.toArray();
  let flushed = 0;
  for (const write of queued) {
    try {
      await markAttendance({
        armId: write.armId,
        classSubjectId: write.classSubjectId,
        date: write.date,
        entries: write.entries,
      });
      await offlineDb.attendanceQueue.delete(write.key);
      flushed += 1;
    } catch {
      // Still offline, or the server rejected it — leave queued, try again
      // on the next reconnect/poll rather than losing the write.
    }
  }
  return flushed;
}
