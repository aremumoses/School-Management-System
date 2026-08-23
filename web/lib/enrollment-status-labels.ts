import type { EnrollmentStatus } from '@/lib/types/students';

export const ENROLLMENT_STATUS_LABELS: Record<EnrollmentStatus, string> = {
  ACTIVE: 'Active',
  PROMOTED: 'Promoted',
  REPEATED: 'Repeated',
  TRANSFERRED: 'Transferred',
  WITHDRAWN: 'Withdrawn',
  GRADUATED: 'Graduated',
};

/** Badge variant per status — success-soft for the good states, warning-soft for in-between, error-soft for the ones a school treats as "no longer here." */
export const ENROLLMENT_STATUS_BADGE: Record<
  EnrollmentStatus,
  'success' | 'warning' | 'error' | 'info'
> = {
  ACTIVE: 'success',
  PROMOTED: 'info',
  REPEATED: 'warning',
  TRANSFERRED: 'warning',
  WITHDRAWN: 'error',
  GRADUATED: 'info',
};
