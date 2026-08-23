import type { components } from '@/types/api';

/**
 * Request DTOs from the generated OpenAPI types; response shapes
 * hand-written against api/src/modules/lesson-notes/lesson-notes.service.ts
 * (NOTE_INCLUDE) — same convention as every other lib/types/*.ts file.
 */

export type CreateLessonNoteInput = components['schemas']['CreateLessonNoteDto'];
export type UpdateLessonNoteInput = components['schemas']['UpdateLessonNoteDto'];
export type ReviewLessonNoteInput = components['schemas']['ReviewLessonNoteDto'];
export type DuplicateLessonNoteInput = components['schemas']['DuplicateLessonNoteDto'];

export type LessonNoteStatus = 'PENDING' | 'APPROVED' | 'RETURNED';

export interface LessonNoteDto {
  id: string;
  classSubjectId: string;
  termId: string;
  weekOfTerm: number;
  topic: string;
  nerdcReference: string | null;
  objectives: string | null;
  content: string;
  activities: string | null;
  evaluation: string | null;
  attachmentUrl: string | null;
  status: LessonNoteStatus;
  submittedByStaffId: string;
  reviewedByStaffId: string | null;
  reviewerNotes: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  classSubject: {
    id: string;
    classId: string;
    subjectId: string;
    subject: { id: string; name: string };
    class: { id: string; name: string };
  };
  submittedBy: { firstName: string; lastName: string };
  reviewedBy: { firstName: string; lastName: string } | null;
  term: { name: string };
}
