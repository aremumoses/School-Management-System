import { Badge } from '@/components/ui/badge';
import type { CandidateStage } from '@/lib/types/hr';

const VARIANTS: Record<CandidateStage, 'outline' | 'secondary' | 'warning' | 'success' | 'error'> = {
  APPLIED: 'outline',
  SHORTLISTED: 'secondary',
  INTERVIEWED: 'warning',
  OFFERED: 'warning',
  HIRED: 'success',
  REJECTED: 'error',
};

const LABELS: Record<CandidateStage, string> = {
  APPLIED: 'Applied',
  SHORTLISTED: 'Shortlisted',
  INTERVIEWED: 'Interviewed',
  OFFERED: 'Offered',
  HIRED: 'Hired',
  REJECTED: 'Rejected',
};

export function CandidateStageBadge({ stage }: { stage: CandidateStage }) {
  return <Badge variant={VARIANTS[stage]}>{LABELS[stage]}</Badge>;
}
