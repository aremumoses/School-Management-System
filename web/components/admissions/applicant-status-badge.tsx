import { Badge } from '@/components/ui/badge';
import type { ApplicantStatus } from '@/lib/types/admissions';

const LABELS: Record<ApplicantStatus, string> = {
  SUBMITTED: 'Submitted',
  UNDER_REVIEW: 'Under Review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  CONVERTED: 'Enrolled',
};

const VARIANTS: Record<
  ApplicantStatus,
  'warning' | 'info' | 'success' | 'error' | 'secondary'
> = {
  SUBMITTED: 'warning',
  UNDER_REVIEW: 'info',
  APPROVED: 'success',
  REJECTED: 'error',
  CONVERTED: 'secondary',
};

export function ApplicantStatusBadge({ status }: { status: ApplicantStatus }) {
  return <Badge variant={VARIANTS[status]}>{LABELS[status]}</Badge>;
}
