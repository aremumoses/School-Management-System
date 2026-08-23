import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { gradeBadgeVariant } from '@/lib/grading';
import type { StudentBroadsheetRowDto } from '@/lib/types/results';
import { cn } from '@/lib/utils';

function ordinal(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

/**
 * The wide subject-columns × student-rows grid shared by the Exam
 * Officer's broadsheet, the Admin's approval view, and the Class
 * Teacher's consolidated read-only summary — design system note: dense,
 * horizontally scrollable with a sticky name column, grades as badges,
 * overall position highlighted. Assumes `rows` is non-empty (the page
 * itself renders the empty state, per the DataTable convention).
 */
export function BroadsheetTable({
  rows,
  renderExtraColumn,
  extraColumnHeader,
}: {
  rows: StudentBroadsheetRowDto[];
  renderExtraColumn?: (row: StudentBroadsheetRowDto) => ReactNode;
  extraColumnHeader?: string;
}) {
  const subjectNames = rows[0]?.subjects.map((s) => s.subjectName) ?? [];

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-card">
          <TableRow>
            <TableHead className="sticky left-0 z-20 bg-card">Student</TableHead>
            {subjectNames.map((name) => (
              <TableHead key={name} className="text-center whitespace-nowrap">
                {name}
              </TableHead>
            ))}
            <TableHead className="text-center whitespace-nowrap">Average</TableHead>
            <TableHead className="bg-primary/5 text-center whitespace-nowrap">Position</TableHead>
            {extraColumnHeader && <TableHead>{extraColumnHeader}</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.studentId}>
              <TableCell className="sticky left-0 z-10 bg-card">
                <p className="text-sm font-medium text-foreground">
                  {row.firstName} {row.lastName}
                </p>
                <p className="font-mono text-xs text-muted-foreground">{row.admissionNumber}</p>
              </TableCell>
              {row.subjects.map((subject) => (
                <TableCell key={subject.classSubjectId} className="text-center">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-sm font-semibold tabular-nums">{subject.total.toFixed(1)}</span>
                    <Badge variant={gradeBadgeVariant(subject.grade)}>{subject.grade}</Badge>
                  </div>
                </TableCell>
              ))}
              <TableCell className="text-center text-sm font-semibold tabular-nums">
                {row.overallAverage.toFixed(1)}%
              </TableCell>
              <TableCell className={cn('bg-primary/5 text-center text-sm font-bold tabular-nums')}>
                {ordinal(row.overallPosition)} / {row.classSize}
              </TableCell>
              {renderExtraColumn && <TableCell>{renderExtraColumn(row)}</TableCell>}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
