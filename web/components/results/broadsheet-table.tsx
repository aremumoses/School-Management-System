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

const HEAD = 'h-12 font-semibold text-primary dark:text-heading';

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
  className,
}: {
  rows: StudentBroadsheetRowDto[];
  renderExtraColumn?: (row: StudentBroadsheetRowDto) => ReactNode;
  extraColumnHeader?: string;
  /** Container overrides — e.g. `rounded-none border-0` inside a card that already frames the table. */
  className?: string;
}) {
  const subjectNames = rows[0]?.subjects.map((s) => s.subjectName) ?? [];

  return (
    <div className={cn('overflow-x-auto rounded-xl border border-border bg-card', className)}>
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-card">
          <TableRow className="bg-primary/5 hover:bg-primary/5">
            {/* Sticky cells need an opaque fill: the tinted header colour mixed
                onto the card, so scrolled columns can't show through. */}
            <TableHead
              className={cn(
                HEAD,
                'sticky left-0 z-20 bg-[color-mix(in_oklab,var(--primary)_5%,var(--card))] pl-5',
              )}
            >
              Student
            </TableHead>
            {subjectNames.map((name) => (
              <TableHead key={name} className={cn(HEAD, 'text-center whitespace-nowrap')}>
                {name}
              </TableHead>
            ))}
            <TableHead className={cn(HEAD, 'text-center whitespace-nowrap')}>Average</TableHead>
            <TableHead className={cn(HEAD, 'bg-primary/5 text-center whitespace-nowrap')}>Position</TableHead>
            {extraColumnHeader && <TableHead className={cn(HEAD, 'pr-5')}>{extraColumnHeader}</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.studentId} className="hover:bg-transparent">
              <TableCell className="sticky left-0 z-10 bg-card py-3 pl-5">
                <p className="text-sm font-semibold text-heading">
                  {row.firstName} {row.lastName}
                </p>
                <p className="font-mono text-xs text-primary dark:text-muted-foreground">
                  {row.admissionNumber}
                </p>
              </TableCell>
              {row.subjects.map((subject) => (
                <TableCell key={subject.classSubjectId} className="py-3 text-center">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-sm font-semibold text-heading tabular-nums">
                      {subject.total.toFixed(1)}
                    </span>
                    <Badge variant={gradeBadgeVariant(subject.grade)}>{subject.grade}</Badge>
                  </div>
                </TableCell>
              ))}
              <TableCell className="py-3 text-center text-sm font-semibold text-heading tabular-nums">
                {row.overallAverage.toFixed(1)}%
              </TableCell>
              <TableCell className="bg-primary/5 py-3 text-center text-sm font-bold text-primary tabular-nums dark:text-foreground">
                {ordinal(row.overallPosition)} / {row.classSize}
              </TableCell>
              {renderExtraColumn && <TableCell className="py-3 pr-5">{renderExtraColumn(row)}</TableCell>}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
