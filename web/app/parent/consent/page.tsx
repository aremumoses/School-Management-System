import { ClipboardSignature, Users } from 'lucide-react';
import { PageHeader } from '@/components/dashboard/page-header';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { listGuardianConsentForms } from '@/lib/actions/clubs';
import { apiFetch } from '@/lib/api';
import { CONSENT_TYPE_LABELS } from '@/lib/consent-labels';
import type { StudentListResponse } from '@/lib/types/students';
import { ChildSwitcher } from '../fees/child-switcher';
import { ESignActions } from './e-sign-actions';

export default async function ParentConsentPage({
  searchParams,
}: {
  searchParams: Promise<{ studentId?: string }>;
}) {
  const params = await searchParams;
  const childrenRes = await apiFetch<StudentListResponse>('/students');
  const children = childrenRes.data;

  if (children.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Consent Forms" />
        <Empty className="border border-dashed border-border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Users />
            </EmptyMedia>
            <EmptyTitle>No children linked to your account</EmptyTitle>
            <EmptyDescription>
              Contact the school office if this doesn&apos;t look right.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  const selectedId = children.some((c) => c.id === params.studentId)
    ? params.studentId!
    : children[0].id;
  const child = children.find((c) => c.id === selectedId)!;

  const allForms = await listGuardianConsentForms();
  const forms = allForms.filter((f) => f.student.id === selectedId);
  const pending = forms.filter((f) => !f.myResponse);
  const answered = forms.filter((f) => f.myResponse);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Consent Forms"
        description={`Permission slips for ${child.firstName} — e-sign by typing your full name.`}
      />

      {children.length > 1 && (
        <ChildSwitcher
          options={children.map((c) => ({ id: c.id, label: `${c.firstName} ${c.lastName}` }))}
          selectedId={selectedId}
        />
      )}

      {forms.length === 0 ? (
        <Empty className="border border-dashed border-border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ClipboardSignature />
            </EmptyMedia>
            <EmptyTitle>Nothing to sign</EmptyTitle>
            <EmptyDescription>
              No consent forms have been sent for {child.firstName} yet.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="space-y-6">
          {pending.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-foreground">
                Awaiting your response ({pending.length})
              </h2>
              {pending.map((form) => (
                <Card key={form.id} className="border-l-2 border-l-warning">
                  <CardContent className="space-y-3 py-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-foreground">{form.title}</p>
                      <Badge variant="outline">{CONSENT_TYPE_LABELS[form.type]}</Badge>
                    </div>
                    <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                      {form.description}
                    </p>
                    <ESignActions
                      formId={form.id}
                      formTitle={form.title}
                      studentId={selectedId}
                      studentName={`${child.firstName} ${child.lastName}`}
                    />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {answered.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-foreground">
                Responded ({answered.length})
              </h2>
              {answered.map((form) => (
                <Card key={form.id}>
                  <CardContent className="space-y-2 py-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-foreground">{form.title}</p>
                      {form.myResponse!.response === 'CONSENTED' ? (
                        <Badge variant="success">Consented</Badge>
                      ) : (
                        <Badge variant="error">Declined</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Signed <span className="italic">“{form.myResponse!.signatureName}”</span> on{' '}
                      {new Date(form.myResponse!.respondedAt).toLocaleString('en-GB', {
                        day: 'numeric',
                        month: 'long',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                    <ESignActions
                      formId={form.id}
                      formTitle={form.title}
                      studentId={selectedId}
                      studentName={`${child.firstName} ${child.lastName}`}
                      changeMode
                    />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
