import { ChevronRight, ClipboardSignature } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { CONSENT_TYPE_LABELS } from '@/lib/consent-labels';
import type { ConsentFormRowDto } from '@/lib/types/clubs';

/** The sent consent forms, one row each, inside a single white card. */
export function ConsentFormList({ forms }: { forms: ConsentFormRowDto[] }) {
  return (
    <section className="overflow-hidden rounded-xl bg-card dark:ring-1 dark:ring-foreground/10">
      <div className="flex items-center gap-2 border-b border-border px-5 py-4 sm:px-6">
        <h2 className="text-lg font-semibold text-heading">Sent Forms</h2>
        <Badge variant="secondary">{forms.length}</Badge>
      </div>
      <ul className="divide-y divide-border">
        {forms.map((form) => (
          <li key={form.id}>
            <Link
              href={`/admin/consent-forms/${form.id}`}
              className="group flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-primary/5 focus-visible:bg-primary/5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset sm:flex-row sm:items-center sm:gap-4 sm:px-6"
            >
              <div className="flex min-w-0 flex-1 items-center gap-4">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <ClipboardSignature className="size-5" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-heading group-hover:text-primary dark:group-hover:text-foreground">
                    {form.title}
                  </p>
                  <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                    <span className="rounded-md bg-primary/10 px-2 py-0.5 font-semibold text-primary dark:text-foreground">
                      {CONSENT_TYPE_LABELS[form.type]}
                    </span>
                    <span>{form.armLabel ?? 'Whole school'}</span>
                    <span aria-hidden="true">·</span>
                    <span>
                      by {form.createdBy.firstName} {form.createdBy.lastName}
                    </span>
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-1.5 sm:pl-0">
                <Badge variant="success">{form.tally.consented} consented</Badge>
                <Badge variant="error">{form.tally.declined} declined</Badge>
                <Badge variant="outline">{form.tally.noResponse} pending</Badge>
                <ChevronRight
                  className="ml-1 hidden size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 sm:block"
                  aria-hidden="true"
                />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
