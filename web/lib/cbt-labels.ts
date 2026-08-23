import type {
  CBTTestStatus,
  QuestionDifficulty,
  QuestionStatus,
  QuestionType,
} from '@/lib/types/cbt';

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  MCQ_SINGLE: 'Multiple Choice',
  MCQ_MULTIPLE: 'Multiple Response',
  TRUE_FALSE: 'True / False',
  FILL_BLANK: 'Fill in the Blank',
  MATCHING: 'Matching',
  ESSAY: 'Essay',
};

export const DIFFICULTY_LABELS: Record<QuestionDifficulty, string> = {
  EASY: 'Easy',
  MEDIUM: 'Medium',
  HARD: 'Hard',
};

export const QUESTION_STATUS_BADGE: Record<
  QuestionStatus,
  'warning' | 'success' | 'error'
> = {
  PENDING: 'warning',
  APPROVED: 'success',
  RETURNED: 'error',
};

export const TEST_STATUS_BADGE: Record<
  CBTTestStatus,
  'outline' | 'info' | 'success' | 'error'
> = {
  DRAFT: 'outline',
  SCHEDULED: 'info',
  OPEN: 'success',
  CLOSED: 'error',
};
