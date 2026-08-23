import { submitScores } from '@/lib/actions/results';
import { offlineDb, type QueuedScoreSubmission } from './db';

export type EnqueuedScoreSubmission = Omit<QueuedScoreSubmission, 'key' | 'queuedAt'>;

function queueKey(write: EnqueuedScoreSubmission): string {
  // One queued row per (classSubject, term) — a second "Submit Final
  // Scores" tap for the same context while still offline overwrites the
  // pending entry via put() rather than queuing a duplicate submission.
  return `${write.classSubjectId}::${write.termId}`;
}

export async function enqueueScoreSubmission(write: EnqueuedScoreSubmission): Promise<void> {
  await offlineDb.scoreQueue.put({
    ...write,
    key: queueKey(write),
    queuedAt: Date.now(),
  });
}

export async function getQueuedScoreSubmission(
  classSubjectId: string,
  termId: string,
): Promise<QueuedScoreSubmission | undefined> {
  return offlineDb.scoreQueue.get(`${classSubjectId}::${termId}`);
}

export async function getQueuedScoreCount(): Promise<number> {
  return offlineDb.scoreQueue.count();
}

/** Same non-losing retry contract as flushAttendanceQueue — a write that still fails stays queued. */
export async function flushScoreQueue(): Promise<number> {
  const queued = await offlineDb.scoreQueue.toArray();
  let flushed = 0;
  for (const write of queued) {
    try {
      await submitScores({
        classSubjectId: write.classSubjectId,
        termId: write.termId,
        entries: write.entries,
      });
      await offlineDb.scoreQueue.delete(write.key);
      flushed += 1;
    } catch {
      // Still offline, or the server rejected it (e.g. deadline passed) —
      // leave queued rather than silently dropping the teacher's work.
    }
  }
  return flushed;
}
