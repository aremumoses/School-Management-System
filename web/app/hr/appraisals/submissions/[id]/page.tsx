import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/dashboard/page-header';
import { getAppraisalSubmission } from '@/lib/actions/appraisal';
import { ApiError } from '@/lib/api';
import { AppraisalFormFill } from './appraisal-form-fill';

export default async function AppraisalSubmissionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const submission = await getAppraisalSubmission(id).catch((error: unknown) => {
    if (error instanceof ApiError && (error.status === 404 || error.status === 403)) notFound();
    throw error;
  });

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/hr/appraisals/${submission.cycleId}`}
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          Back to Cycle
        </Link>
        <PageHeader
          title={`Appraisal — ${submission.staff?.firstName} ${submission.staff?.lastName}`}
          description={`Reviewer: ${submission.reviewer?.firstName} ${submission.reviewer?.lastName}`}
        />
      </div>

      <AppraisalFormFill submission={submission} />
    </div>
  );
}
