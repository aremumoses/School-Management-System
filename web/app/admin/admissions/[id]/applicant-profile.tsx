import { ArrowLeft, Cake, CheckCircle2, Phone, School, Users } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { ApplicantStatusBadge } from '@/components/admissions/applicant-status-badge';
import { ProfileHero } from '@/components/dashboard/profile-hero';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { ApplicantDto, ApplicantStatus } from '@/lib/types/admissions';
import { type ClassOption, ConvertForm } from './convert-form';
import { OfferLetterStatus } from './offer-letter-status';
import { ReviewActions } from './review-actions';

const STATUS_GUIDANCE: Record<ApplicantStatus, string> = {
  SUBMITTED: 'New application. Mark it under review, or approve or reject it straight away.',
  UNDER_REVIEW: 'Under review. Approving sends an offer letter; rejecting needs a reason.',
  APPROVED: 'Approved. Download the offer letter and enroll the applicant below.',
  REJECTED: 'Rejected. No offer letter was sent.',
  CONVERTED: 'Enrolled. This applicant now has a student record.',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** "MALE" → "Male". */
function formatGender(value: string): string {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold break-words text-heading">{value || '—'}</dd>
    </div>
  );
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl bg-card p-5 sm:p-6 dark:ring-1 dark:ring-foreground/10">
      <div className="mb-5">
        <h2 className="text-lg leading-snug font-semibold text-heading">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  );
}

/** The applicant detail page's content, kept apart from its data fetching. */
export function ApplicantProfile({
  applicant,
  classes,
}: {
  applicant: ApplicantDto;
  classes: ClassOption[];
}) {
  const guardianName = `${applicant.guardianFirstName} ${applicant.guardianLastName}`;

  return (
    <div className="space-y-6">
      <Link
        href="/admin/admissions"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-primary dark:hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to Admissions
      </Link>

      <ProfileHero
        name={`${applicant.firstName} ${applicant.lastName}`}
        role="Applicant"
        meta={[
          `Applied for ${applicant.intendedClassLevel}`,
          `Submitted ${formatDate(applicant.submittedAt)}`,
        ]}
        initials={`${applicant.firstName[0] ?? ''}${applicant.lastName[0] ?? ''}`.toUpperCase()}
        badge={<ApplicantStatusBadge status={applicant.status} />}
        details={[
          { icon: School, label: 'Intended class', value: applicant.intendedClassLevel },
          { icon: Cake, label: 'Date of birth', value: formatDate(applicant.dateOfBirth) },
          { icon: Users, label: 'Guardian', value: guardianName },
          { icon: Phone, label: 'Guardian phone', value: applicant.guardianPhone },
        ]}
      />

      <section className="flex flex-col gap-4 rounded-xl bg-card p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6 dark:ring-1 dark:ring-foreground/10">
        <div className="min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-heading">Application Review</h2>
            {applicant.applicationFeePaid ? (
              <Badge variant="success">Fee paid</Badge>
            ) : (
              <Badge variant="secondary">Fee not paid</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{STATUS_GUIDANCE[applicant.status]}</p>
        </div>
        <ReviewActions applicantId={applicant.id} currentStatus={applicant.status} />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Applicant Details">
          <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
            <InfoRow label="First name" value={applicant.firstName} />
            <InfoRow label="Last name" value={applicant.lastName} />
            <InfoRow label="Date of birth" value={formatDate(applicant.dateOfBirth)} />
            <InfoRow label="Gender" value={formatGender(applicant.gender)} />
            <InfoRow label="Intended class" value={applicant.intendedClassLevel} />
            <InfoRow label="Home address" value={applicant.address} />
          </dl>
        </SectionCard>

        <SectionCard title="Guardian / Parent">
          <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
            <InfoRow label="First name" value={applicant.guardianFirstName} />
            <InfoRow label="Last name" value={applicant.guardianLastName} />
            <InfoRow label="Email" value={applicant.guardianEmail} />
            <InfoRow label="Phone" value={applicant.guardianPhone} />
          </dl>
        </SectionCard>
      </div>

      {applicant.reviewerNotes && (
        <SectionCard title="Reviewer Notes">
          <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">
            {applicant.reviewerNotes}
          </p>
        </SectionCard>
      )}

      {applicant.feeTransactions.length > 0 && (
        <SectionCard title="Application Fee Transactions">
          <ul className="divide-y divide-border text-sm">
            {applicant.feeTransactions.map((tx) => (
              <li
                key={tx.id}
                className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <span className="min-w-0 truncate font-mono font-medium text-primary dark:text-foreground">
                  {tx.reference}
                </span>
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
        </SectionCard>
      )}

      {/* Offer letter — only shown after APPROVED */}
      {(applicant.status === 'APPROVED' || applicant.status === 'CONVERTED') && (
        <SectionCard
          title="Offer Letter"
          description="Generated automatically when the application is approved."
        >
          <OfferLetterStatus url={applicant.offerLetterUrl} />
        </SectionCard>
      )}

      {/* Convert to student — only shown when APPROVED and not yet converted */}
      {applicant.status === 'APPROVED' && !applicant.convertedStudentId && (
        <ConvertForm applicantId={applicant.id} classes={classes} />
      )}

      {/* Enrolled — link to student profile */}
      {applicant.status === 'CONVERTED' && applicant.convertedStudentId && (
        <div className="flex flex-col gap-3 rounded-xl border border-success-soft bg-success-soft px-5 py-4 text-sm text-success-soft-foreground sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2">
            <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
            This applicant has been enrolled.
          </p>
          <Button
            variant="outline"
            size="sm"
            render={<Link href={`/admin/students/${applicant.convertedStudentId}`} />}
          >
            View student profile
          </Button>
        </div>
      )}
    </div>
  );
}
