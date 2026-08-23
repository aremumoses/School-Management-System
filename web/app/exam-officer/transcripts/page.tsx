import { Download, GraduationCap, Search } from 'lucide-react';
import { PageHeader } from '@/components/dashboard/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { getTranscript } from '@/lib/actions/results';
import { apiFetch } from '@/lib/api';
import { gradeBadgeVariant } from '@/lib/grading';
import type { StudentListResponse } from '@/lib/types/students';
import type { TranscriptResponseDto } from '@/lib/types/results';

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

export default async function TranscriptsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; studentId?: string }>;
}) {
  const params = await searchParams;
  const search = params.search?.trim() ?? '';

  let results: StudentListResponse | null = null;
  if (search) {
    const query = new URLSearchParams({ search, pageSize: '10', page: '1' });
    results = await apiFetch<StudentListResponse>(`/students?${query.toString()}`);
  }

  let transcript: TranscriptResponseDto | null = null;
  if (params.studentId) {
    transcript = await getTranscript(params.studentId).catch(() => null);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transcripts"
        description="A student's full academic history across every session, with report-card downloads per term."
      />

      {/* Student search */}
      <Card>
        <CardContent className="pt-4">
          <form method="get" className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-56 space-y-1">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="search">
                Find a student
              </label>
              <input
                id="search"
                name="search"
                defaultValue={search}
                placeholder="Name or admission number…"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Search className="size-4" aria-hidden="true" />
              Search
            </button>
          </form>

          {results && (
            <div className="mt-4 divide-y divide-border rounded-lg border border-border">
              {results.data.length === 0 ? (
                <p className="px-4 py-3 text-sm text-muted-foreground">
                  No students match “{search}”.
                </p>
              ) : (
                results.data.map((student) => (
                  <a
                    key={student.id}
                    href={`/exam-officer/transcripts?search=${encodeURIComponent(search)}&studentId=${student.id}`}
                    className={`flex items-center justify-between px-4 py-2.5 text-sm hover:bg-muted/50 ${
                      student.id === params.studentId ? 'bg-primary/10' : ''
                    }`}
                  >
                    <span className="font-medium text-foreground">
                      {student.firstName} {student.lastName}
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {student.admissionNumber}
                    </span>
                  </a>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transcript */}
      {!params.studentId ? (
        <Empty className="border border-dashed border-border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <GraduationCap />
            </EmptyMedia>
            <EmptyTitle>Search for a student</EmptyTitle>
            <EmptyDescription>
              Find a student above and select them to view their full transcript.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : !transcript ? (
        <p className="text-center text-sm text-muted-foreground">
          Couldn&apos;t load this student&apos;s transcript.
        </p>
      ) : (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">
            {transcript.student.firstName} {transcript.student.lastName}{' '}
            <span className="font-mono text-sm font-normal text-muted-foreground">
              {transcript.student.admissionNumber}
            </span>
          </h2>

          {transcript.terms.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No published results on record for this student yet.
            </p>
          ) : (
            transcript.terms.map((term) => (
              <Card key={`${term.termId}-${term.armId}`}>
                <CardHeader className="flex-row flex-wrap items-center justify-between space-y-0 gap-2">
                  <CardTitle className="text-base">
                    {term.sessionName} — {term.termName} Term · {term.className} {term.armName}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {term.overallAverage != null && (
                      <Badge variant="outline" className="tabular-nums">
                        Avg {term.overallAverage.toFixed(1)}%
                      </Badge>
                    )}
                    {term.overallPosition != null && term.classSize != null && (
                      <Badge variant="outline" className="tabular-nums">
                        {ordinal(term.overallPosition)} of {term.classSize}
                      </Badge>
                    )}
                    {term.reportCardUrl && (
                      <Button
                        size="sm"
                        variant="outline"
                        render={<a href={term.reportCardUrl} target="_blank" rel="noreferrer" />}
                      >
                        <Download className="size-3.5" aria-hidden="true" />
                        Report Card
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {term.subjects.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No subject rows for this term.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="text-left text-xs text-muted-foreground">
                          <tr>
                            <th className="pb-2 font-medium">Subject</th>
                            <th className="pb-2 text-right font-medium">Total</th>
                            <th className="pb-2 font-medium">Grade</th>
                            <th className="pb-2 font-medium">Remark</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {term.subjects.map((subject) => (
                            <tr key={subject.subjectName}>
                              <td className="py-1.5">{subject.subjectName}</td>
                              <td className="py-1.5 text-right tabular-nums">
                                {subject.total.toFixed(1)}
                              </td>
                              <td className="py-1.5">
                                <Badge variant={gradeBadgeVariant(subject.grade)}>
                                  {subject.grade}
                                </Badge>
                              </td>
                              <td className="py-1.5 text-muted-foreground">{subject.remark}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
