import { Badge } from '@/components/ui/badge';
import type { DisciplinaryActionStatus, IncidentSeverity } from '@/lib/types/discipline';

const SEVERITY_LABELS: Record<IncidentSeverity, string> = {
  MINOR: 'Minor',
  MODERATE: 'Moderate',
  SEVERE: 'Severe',
};

/** A minor-to-severe gradient anchored on the design system's warning/error pair (§2) — moderate sits in the warning bucket since it isn't yet severe. */
const SEVERITY_VARIANT: Record<IncidentSeverity, 'warning' | 'error'> = {
  MINOR: 'warning',
  MODERATE: 'warning',
  SEVERE: 'error',
};

export function SeverityBadge({ severity }: { severity: IncidentSeverity }) {
  return <Badge variant={SEVERITY_VARIANT[severity]}>{SEVERITY_LABELS[severity]}</Badge>;
}

const STATUS_LABELS: Record<DisciplinaryActionStatus, string> = {
  PROPOSED: 'Pending Approval',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};

const STATUS_VARIANT: Record<DisciplinaryActionStatus, 'warning' | 'success' | 'secondary'> = {
  PROPOSED: 'warning',
  APPROVED: 'success',
  REJECTED: 'secondary',
};

export function ActionStatusBadge({ status }: { status: DisciplinaryActionStatus }) {
  return <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABELS[status]}</Badge>;
}
