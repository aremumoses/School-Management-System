import { ClipboardSignature } from 'lucide-react';
import { PageHeader } from '@/components/dashboard/page-header';
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
import type { ClassDto } from '@/lib/types/academic';
import { ConsentFormList } from './consent-form-list';
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
        <Empty className="rounded-xl bg-card py-12 dark:ring-1 dark:ring-foreground/10">
          <EmptyHeader>
            <EmptyMedia
              variant="icon"
              className="size-12 rounded-full bg-primary/10 text-primary [&_svg:not([class*='size-'])]:size-5"
            >
              <ClipboardSignature />
            </EmptyMedia>
            <EmptyTitle className="text-base font-semibold text-heading">No consent forms sent yet</EmptyTitle>
            <EmptyDescription>
              Send one to a class or the whole school — parents e-sign from their portal.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <NewConsentFormDialog armOptions={armOptions} />
          </EmptyContent>
        </Empty>
      ) : (
        <ConsentFormList forms={forms} />
      )}
    </div>
  );
}
