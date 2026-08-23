import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { GradebookDto } from '@/lib/types/assignments';
import { cn } from '@/lib/utils';

/** Student × term score history — at-risk rows carry a visible badge and a left border, never color alone. */
export function GradebookTable({ gradebook }: { gradebook: GradebookDto }) {
  if (gradebook.students.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No scores recorded yet for this class/subject in this session.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Student</TableHead>
            {gradebook.terms.map((term) => (
              <TableHead key={term.termId} className="text-right">
                {term.termName}
              </TableHead>
            ))}
            <TableHead className="text-right">Average</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {gradebook.students.map((student) => (
            <TableRow
              key={student.studentId}
              className={cn(student.atRisk && 'border-l-2 border-l-error bg-error-soft/30')}
            >
              <TableCell>
                <p className="font-medium text-foreground">
                  {student.firstName} {student.lastName}
                </p>
                <p className="font-mono text-xs text-muted-foreground">
                  {student.admissionNumber}
                </p>
              </TableCell>
              {student.perTerm.map((term) => (
                <TableCell key={term.termId} className="text-right tabular-nums">
                  {term.average != null ? `${term.average}%` : '—'}
                </TableCell>
              ))}
              <TableCell className="text-right tabular-nums font-semibold">
                {student.overallAverage != null ? `${student.overallAverage}%` : '—'}
              </TableCell>
              <TableCell>
                {student.atRisk ? (
                  <Badge variant="error">At Risk</Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
