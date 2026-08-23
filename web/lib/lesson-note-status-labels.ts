import type { LessonNoteStatus } from '@/lib/types/lesson-notes';

/** Discipline-style severity convention — always paired with the text label (design system §2, never color-only). */
export const LESSON_NOTE_STATUS_BADGE: Record<
  LessonNoteStatus,
  'warning' | 'success' | 'error'
> = {
  PENDING: 'warning',
  APPROVED: 'success',
  RETURNED: 'error',
};

export const LESSON_NOTE_STATUS_LABELS: Record<LessonNoteStatus, string> = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  RETURNED: 'Returned',
};
