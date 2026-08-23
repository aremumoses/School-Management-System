import { Badge } from '@/components/ui/badge';
import type { GeneratedDocumentStatus } from '@/lib/types/documents';

const LABELS: Record<GeneratedDocumentStatus, string> = {
  DRAFT: 'Awaiting Approval',
  APPROVED: 'Approved',
};

const VARIANTS: Record<GeneratedDocumentStatus, 'warning' | 'success'> = {
  DRAFT: 'warning',
  APPROVED: 'success',
};

export function DocumentStatusBadge({ status }: { status: GeneratedDocumentStatus }) {
  return <Badge variant={VARIANTS[status]}>{LABELS[status]}</Badge>;
}
