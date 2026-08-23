import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import type { AppraisalSubmissionDto, AppraisalSubmissionStatus } from '@/lib/types/appraisal';
import { SignOffButton } from './sign-off-button';

const STATUS_BADGE: Record<AppraisalSubmissionStatus, 'secondary' | 'warning' | 'success'> = {
  DRAFT: 'secondary',
  SUBMITTED: 'warning',
  SIGNED_OFF: 'success',
};

export function SubmissionList({ submissions }: { submissions: AppraisalSubmissionDto[] }) {
  if (submissions.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        No reviewers assigned yet.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border rounded-lg border border-border">
      {submissions.map((s) => (
        <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div>
            <Link
              href={`/hr/appraisals/staff/${s.staffId}`}
              className="font-medium text-foreground hover:text-primary hover:underline"
            >
              {s.staff?.firstName} {s.staff?.lastName}
            </Link>
            <p className="text-xs text-muted-foreground">
              Reviewer: {s.reviewer?.firstName} {s.reviewer?.lastName}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={STATUS_BADGE[s.status]}>{s.status.replace('_', ' ')}</Badge>
            <Link
              href={`/hr/appraisals/submissions/${s.id}`}
              className="text-sm text-primary hover:underline"
            >
              {s.status === 'DRAFT' ? 'Fill In' : 'View'}
            </Link>
            {s.status === 'SUBMITTED' && <SignOffButton submissionId={s.id} />}
          </div>
        </li>
      ))}
    </ul>
  );
}
