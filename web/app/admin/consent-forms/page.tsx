import { ClipboardSignature } from 'lucide-react';
import Link from 'next/link';
import { PageHeader } from '@/components/dashboard/page-header';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { listConsentForms } from '@/lib/actions/clubs';
import { apiFetch } from '@/lib/api';
import { CONSENT_TYPE_LABELS } from '@/lib/consent-labels';
import type { ClassDto } from '@/lib/types/academic';
import { NewConsentFormDialog } from './new-consent-form-dialog';

export default async function ConsentFormsPage() {
  const [forms, classes] = await Promise.all([
    listConsentForms(),
    apiFetch<ClassDto[]>('/classes'),
  ]);
  const armOptions = classes.flatMap((klass) =>
    klass.arms.map((arm) => ({ id: arm.id, label: `${klass.name} ${arm.name}` })),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Consent Forms"
        description="E-signed permission slips — excursions, medical authorizations, photo/video consent."
        action={<NewConsentFormDialog armOptions={armOptions} />}
      />

      {forms.length === 0 ? (
        <Empty className="border border-dashed border-border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ClipboardSignature />
            </EmptyMedia>
            <EmptyTitle>No consent forms sent yet</EmptyTitle>
            <EmptyDescription>
              Send one to a class or the whole school — parents e-sign from their portal.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <NewConsentFormDialog armOptions={armOptions} />
          </EmptyContent>
        </Empty>
      ) : (
        <div className="space-y-3">
          {forms.map((form) => (
            <Link key={form.id} href={`/admin/consent-forms/${form.id}`} className="block">
              <Card className="transition-shadow hover:shadow-md">
                <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{form.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {CONSENT_TYPE_LABELS[form.type]} ·{' '}
                      {form.armLabel ?? 'Whole school'} · by {form.createdBy.firstName}{' '}
                      {form.createdBy.lastName}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Badge variant="success">{form.tally.consented} consented</Badge>
                    <Badge variant="error">{form.tally.declined} declined</Badge>
                    <Badge variant="outline">{form.tally.noResponse} pending</Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
