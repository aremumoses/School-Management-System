import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/dashboard/page-header';
import { ApplicantStatusBadge } from '@/components/admissions/applicant-status-badge';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getApplicant } from '@/lib/actions/admissions';
import { ApiError, apiFetch } from '@/lib/api';
import type { ClassDto } from '@/lib/types/academic';
import { ConvertForm } from './convert-form';
import { OfferLetterStatus } from './offer-letter-status';
import { ReviewActions } from './review-actions';

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="text-sm text-foreground">{value ?? '—'}</span>
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default async function ApplicantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const applicant = await getApplicant(id).catch((err: unknown) => {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  });

  const classes = await apiFetch<ClassDto[]>('/classes');

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/admissions"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          Back to Admissions
        </Link>
        <PageHeader
          title={`${applicant.firstName} ${applicant.lastName}`}
          description={`Applied for ${applicant.intendedClassLevel} · ${formatDate(applicant.submittedAt)}`}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <ApplicantStatusBadge status={applicant.status} />
        {applicant.applicationFeePaid ? (
          <Badge variant="success">Fee paid</Badge>
        ) : (
          <Badge variant="secondary">Fee not paid</Badge>
        )}
        <ReviewActions applicantId={applicant.id} currentStatus={applicant.status} />
      </div>

      {/* Applicant bio-data */}
      <Card>
        <CardHeader>
          <CardTitle>Applicant Details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <InfoRow label="First name" value={applicant.firstName} />
          <InfoRow label="Last name" value={applicant.lastName} />
          <InfoRow label="Date of birth" value={formatDate(applicant.dateOfBirth)} />
          <InfoRow label="Gender" value={applicant.gender} />
          <InfoRow label="Intended class" value={applicant.intendedClassLevel} />
          <InfoRow label="Home address" value={applicant.address} />
        </CardContent>
      </Card>

      {/* Guardian contact */}
      <Card>
        <CardHeader>
          <CardTitle>Guardian / Parent</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <InfoRow label="First name" value={applicant.guardianFirstName} />
          <InfoRow label="Last name" value={applicant.guardianLastName} />
          <InfoRow label="Email" value={applicant.guardianEmail} />
          <InfoRow label="Phone" value={applicant.guardianPhone} />
        </CardContent>
      </Card>

      {/* Reviewer notes */}
      {applicant.reviewerNotes && (
        <Card>
          <CardHeader>
            <CardTitle>Reviewer Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-foreground">{applicant.reviewerNotes}</p>
          </CardContent>
        </Card>
      )}

      {/* Fee transactions */}
      {applicant.feeTransactions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Application Fee Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border text-sm">
              {applicant.feeTransactions.map((tx) => (
                <li key={tx.id} className="flex items-center justify-between py-2">
                  <span className="font-mono text-muted-foreground">{tx.reference}</span>
                  <Badge
                    variant={
                      tx.status === 'SUCCESS'
                        ? 'success'
                        : tx.status === 'FAILED'
                          ? 'error'
                          : 'warning'
                    }
                  >
                    {tx.status}
                  </Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Offer letter — only shown after APPROVED */}
      {(applicant.status === 'APPROVED' || applicant.status === 'CONVERTED') && (
        <Card>
          <CardHeader>
            <CardTitle>Offer Letter</CardTitle>
          </CardHeader>
          <CardContent>
            <OfferLetterStatus url={applicant.offerLetterUrl} />
          </CardContent>
        </Card>
      )}

      {/* Convert to student — only shown when APPROVED and not yet converted */}
      {applicant.status === 'APPROVED' && !applicant.convertedStudentId && (
        <ConvertForm
          applicantId={applicant.id}
          classes={classes.map((c) => ({
            id: c.id,
            name: c.name,
            arms: c.arms.map((a) => ({ id: a.id, name: a.name, classId: c.id })),
          }))}
        />
      )}

      {/* Enrolled — link to student profile */}
      {applicant.status === 'CONVERTED' && applicant.convertedStudentId && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              This applicant has been enrolled.{' '}
              <Link
                href={`/admin/students/${applicant.convertedStudentId}`}
                className="text-primary underline-offset-4 hover:underline"
              >
                View student profile →
              </Link>
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
