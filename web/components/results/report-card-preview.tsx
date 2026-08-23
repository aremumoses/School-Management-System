import { Download } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { gradeBadgeVariant } from '@/lib/grading';
import type { ReportCardDataDto } from '@/lib/types/results';

const CONDUCT_LABELS: Record<number, string> = {
  5: 'Excellent',
  4: 'Very Good',
  3: 'Good',
  2: 'Fair',
  1: 'Poor',
};

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
 * Mirrors the PDF report card's exact layout (docs/14-module-academic-results.md
 * §6 and api/src/modules/results/report-card/report-card.template.ts) as
 * closely as practical in HTML/CSS, for an on-screen preview before/instead
 * of downloading the PDF. The school's own brand colors are used here
 * (matching the generated document), not the app's own UI chrome — see
 * prompts/00-DESIGN-SYSTEM.md §11.
 */
export function ReportCardPreview({
  data,
  reportCardUrl,
}: {
  data: ReportCardDataDto;
  reportCardUrl: string | null;
}) {
  const primary = data.school.primaryColor || '#1D4ED8';
  const secondary = data.school.secondaryColor || '#F59E0B';

  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b-4 p-4 sm:p-6" style={{ borderColor: primary }}>
        <div className="flex flex-wrap items-center gap-4">
          {data.school.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- a school-uploaded, arbitrary-origin logo; next/image's domain allowlisting isn't worth it for one document header image.
            <img src={data.school.logoUrl} alt="" className="size-14 shrink-0 object-contain" />
          )}
          <div className="min-w-0">
            <p className="text-xl font-bold" style={{ color: primary }}>
              {data.school.name}
            </p>
            {data.school.address && <p className="text-xs text-muted-foreground">{data.school.address}</p>}
            <p className="text-xs text-muted-foreground">
              {data.school.motto && `"${data.school.motto}"`}
              {data.school.registrationNumber && ` · Reg. No: ${data.school.registrationNumber}`}
            </p>
          </div>
          {reportCardUrl && (
            <Button
              nativeButton={false}
              render={<a href={reportCardUrl} download target="_blank" rel="noreferrer" />}
              className="ml-auto"
            >
              <Download className="size-4" aria-hidden="true" />
              Download PDF
            </Button>
          )}
        </div>
        <p
          className="mt-4 text-center text-sm font-bold tracking-wide uppercase"
          style={{ color: secondary }}
        >
          Terminal Report Card — {data.termName} Term, {data.sessionName}
        </p>
      </div>

      <CardContent className="space-y-6 p-4 sm:p-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">Student Name</p>
            <p className="text-sm font-semibold">
              {data.student.firstName} {data.student.lastName}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Admission No.</p>
            <p className="text-sm font-semibold">{data.student.admissionNumber}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Class</p>
            <p className="text-sm font-semibold">
              {data.className} ({data.armName})
            </p>
          </div>
          {data.student.photoUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- arbitrary-origin student photo, see logo note above.
            <img
              src={data.student.photoUrl}
              alt=""
              className="size-20 rounded-md border border-border object-cover"
            />
          )}
        </div>

        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead style={{ backgroundColor: primary }}>
              <tr className="text-left text-xs text-white">
                <th className="px-3 py-2">Subject</th>
                {data.componentNames.map((name) => (
                  <th key={name} className="px-3 py-2 text-center whitespace-nowrap">
                    {name}
                  </th>
                ))}
                <th className="px-3 py-2 text-center">Total</th>
                <th className="px-3 py-2 text-center">Grade</th>
                <th className="px-3 py-2 text-center whitespace-nowrap">Position</th>
                <th className="px-3 py-2 text-center whitespace-nowrap">Class Avg.</th>
                <th className="px-3 py-2">Remark</th>
              </tr>
            </thead>
            <tbody>
              {data.subjects.map((subject) => (
                <tr key={subject.classSubjectId} className="border-t border-border">
                  <td className="px-3 py-2 font-medium whitespace-nowrap">{subject.subjectName}</td>
                  {data.componentNames.map((name) => {
                    const match = subject.componentScores.find((c) => c.name === name);
                    return (
                      <td key={name} className="px-3 py-2 text-center tabular-nums">
                        {match?.score ?? '-'}
                      </td>
                    );
                  })}
                  <td className="px-3 py-2 text-center font-semibold tabular-nums">
                    {subject.total.toFixed(1)}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <Badge variant={gradeBadgeVariant(subject.grade)}>{subject.grade}</Badge>
                  </td>
                  <td className="px-3 py-2 text-center tabular-nums">
                    {ordinal(subject.positionInSubject)}
                  </td>
                  <td className="px-3 py-2 text-center tabular-nums">
                    {subject.classAverageForSubject.toFixed(1)}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">{subject.remark}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-2 gap-3 rounded-lg border border-border p-3 text-sm sm:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">Total Obtainable</p>
            <p className="font-semibold tabular-nums">{data.totalObtainable.toFixed(1)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Scored</p>
            <p className="font-semibold tabular-nums">{data.totalScored.toFixed(1)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Average</p>
            <p className="font-semibold tabular-nums">{data.overallAverage.toFixed(1)}%</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Position in Class</p>
            <p className="font-semibold tabular-nums">
              {ordinal(data.overallPosition)} of {data.classSize}
            </p>
          </div>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-semibold" style={{ color: primary }}>
            Attendance Summary
          </h3>
          <div className="grid grid-cols-3 gap-3 rounded-lg border border-border p-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Days Present</p>
              <p className="font-semibold tabular-nums">{data.attendance.presentDays}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Days Absent</p>
              <p className="font-semibold tabular-nums">{data.attendance.absentDays}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total School Days</p>
              <p className="font-semibold tabular-nums">{data.attendance.totalDays}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <ConductTable title="Affective Domain" ratings={data.affectiveRatings} accent={primary} />
          <ConductTable title="Psychomotor Domain" ratings={data.psychomotorRatings} accent={primary} />
        </div>

        <div className="space-y-3">
          <div className="rounded-lg border border-border p-3">
            <p className="text-xs font-semibold text-muted-foreground">Form Teacher&apos;s Comment</p>
            <p className="mt-1 text-sm">
              {data.formTeacherComment || <span className="text-muted-foreground">No comment yet.</span>}
            </p>
          </div>
          <div className="rounded-lg border border-border p-3">
            <p className="text-xs font-semibold text-muted-foreground">Principal&apos;s Comment</p>
            <p className="mt-1 text-sm">
              {data.principalComment || <span className="text-muted-foreground">No comment yet.</span>}
            </p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Next term resumes: {data.nextTermResumptionDate ?? 'TBA'}
        </p>
      </CardContent>
    </Card>
  );
}

function ConductTable({
  title,
  ratings,
  accent,
}: {
  title: string;
  ratings: { category: string; score: number }[];
  accent: string;
}) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold" style={{ color: accent }}>
        {title}
      </h3>
      {ratings.length === 0 ? (
        <p className="text-sm text-muted-foreground">No ratings recorded.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <tbody>
              {ratings.map((rating) => (
                <tr key={rating.category} className="border-b border-border last:border-b-0">
                  <td className="px-3 py-1.5">{rating.category}</td>
                  <td className="px-3 py-1.5 text-center tabular-nums">{rating.score}</td>
                  <td className="px-3 py-1.5 text-right text-muted-foreground">
                    {CONDUCT_LABELS[rating.score] ?? ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
