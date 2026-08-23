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
        <li key={s.studentId} className="flex items-center justify-between gap-3 py-2.5">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">
              {s.firstName} {s.lastName}
            </p>
            <p className="font-mono text-xs text-muted-foreground">{s.admissionNumber}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
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
