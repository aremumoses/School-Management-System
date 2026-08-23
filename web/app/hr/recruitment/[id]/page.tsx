import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/dashboard/page-header';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getVacancy } from '@/lib/actions/hr';
import { ApiError } from '@/lib/api';
import { CandidatePipeline } from './candidate-pipeline';

export default async function VacancyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const vacancy = await getVacancy(id).catch((error: unknown) => {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  });

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/hr/recruitment"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          Back to Recruitment Pipeline
        </Link>
        <PageHeader
          title={vacancy.title}
          description={vacancy.closesAt ? `Closes ${new Date(vacancy.closesAt).toLocaleDateString('en-GB')}` : undefined}
          action={<Badge variant={vacancy.status === 'OPEN' ? 'success' : 'secondary'}>{vacancy.status}</Badge>}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Description</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap text-sm text-foreground">{vacancy.description}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Candidate Pipeline ({vacancy.candidates.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <CandidatePipeline candidates={vacancy.candidates} />
        </CardContent>
      </Card>
    </div>
  );
}
