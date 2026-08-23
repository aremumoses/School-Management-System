import type { ResultStage } from '@/lib/types/results';

export const RESULT_STAGE_LABELS: Record<ResultStage, string> = {
  SCORES_IN_PROGRESS: 'Scores In Progress',
  PENDING_COLLATION: 'Pending Collation',
  PENDING_APPROVAL: 'Pending Approval',
  RETURNED: 'Returned for Correction',
  APPROVED: 'Approved',
  PUBLISHED: 'Published',
};

export const RESULT_STAGE_BADGE: Record<
  ResultStage,
  'success' | 'warning' | 'error' | 'info' | 'outline'
> = {
  SCORES_IN_PROGRESS: 'outline',
  PENDING_COLLATION: 'info',
  PENDING_APPROVAL: 'warning',
  RETURNED: 'error',
  APPROVED: 'info',
  PUBLISHED: 'success',
};
