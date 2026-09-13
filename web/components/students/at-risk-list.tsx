import { AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import type { AtRiskReason, AtRiskStudentDto } from '@/lib/types/students';

const REASON_LABEL: Record<AtRiskReason, string> = {
  ATTENDANCE: 'Attendance',
  CA: 'CA Scores',
  BOTH: 'Attendance + CA',
};

// warning/error badge convention, same as every other risk/status
// indicator in this build (e.g. gradebook-table.tsx's inline "At Risk"
// badge) — BOTH is the more severe combination, hence error over warning.
const REASON_VARIANT: Record<AtRiskReason, 'warning' | 'error'> = {
  ATTENDANCE: 'warning',
  CA: 'warning',
  BOTH: 'error',
};

function formatFlaggedDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function initials(firstName: string, lastName: string): string {
  return `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase();
}

export function AtRiskList({ students }: { students: AtRiskStudentDto[] }) {
  if (students.length === 0) {
    return (
      <Empty className="border border-dashed border-border py-6">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <AlertTriangle />
          </EmptyMedia>
          <EmptyTitle>No students currently flagged</EmptyTitle>
          <EmptyDescription>
            Nobody is below the configured attendance/CA thresholds right now.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {students.map((s) => (
        <li key={s.studentId} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
          <span
            aria-hidden="true"
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary dark:text-heading"
          >
            {initials(s.firstName, s.lastName)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-heading">
              {s.firstName} {s.lastName}
            </p>
            <p className="font-mono text-xs text-muted-foreground">{s.admissionNumber}</p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-2">
            <Badge variant={REASON_VARIANT[s.reason]}>{REASON_LABEL[s.reason]}</Badge>
            <span className="text-xs text-muted-foreground">
              Flagged {formatFlaggedDate(s.flaggedAt)}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
