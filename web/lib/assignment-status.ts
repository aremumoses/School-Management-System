import type { SubmissionDto } from '@/lib/types/assignments';

/** Deadline check hoisted out of render paths (React Compiler purity rule). */
export function isDeadlinePassed(dueDate: string): boolean {
  return new Date(dueDate).getTime() < Date.now();
}

/** Not Submitted / Submitted / Graded — shared by the student list, student detail, and parent tracker. */
export function ASSIGNMENT_STATUS(submission: SubmissionDto | null): {
  label: string;
  variant: 'outline' | 'info' | 'success';
} {
  if (!submission) return { label: 'Not Submitted', variant: 'outline' };
  if (submission.gradedAt) return { label: `Graded: ${submission.grade}`, variant: 'success' };
  return { label: 'Submitted', variant: 'info' };
}
