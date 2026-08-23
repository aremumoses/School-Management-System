import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { PageHeader } from '@/components/dashboard/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getConsentResponses, listConsentForms } from '@/lib/actions/clubs';
import { CONSENT_TYPE_LABELS } from '@/lib/consent-labels';

export default async function ConsentFormDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [forms, result] = await Promise.all([
    listConsentForms(),
    getConsentResponses(id),
  ]);
  const form = forms.find((f) => f.id === id);

  return (
    <div className="space-y-6">
      <PageHeader
        title={form?.title ?? 'Consent Form'}
        description={
          form
            ? `${CONSENT_TYPE_LABELS[form.type]} · ${form.armLabel ?? 'Whole school'} · sent by ${form.createdBy.firstName} ${form.createdBy.lastName}`
            : undefined
        }
        action={
          <Button variant="ghost" size="sm" render={<Link href="/admin/consent-forms" />}>
            <ArrowLeft className="size-4" aria-hidden="true" />
            All Forms
          </Button>
        }
      />

      {form && <p className="text-sm text-muted-foreground">{form.description}</p>}

      <div className="flex flex-wrap gap-2">
        <Badge variant="success">{result.tally.consented} consented</Badge>
        <Badge variant="error">{result.tally.declined} declined</Badge>
        <Badge variant="outline">{result.tally.noResponse} no response</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Respondents</CardTitle>
        </CardHeader>
        <CardContent>
          {result.respondents.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No students are targeted by this form.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="pb-2 font-medium">Student</th>
                    <th className="pb-2 font-medium">Response</th>
                    <th className="pb-2 font-medium">Signed By</th>
                    <th className="pb-2 font-medium">When</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {result.respondents.map((row) => (
                    <tr key={row.studentId}>
                      <td className="py-2.5">
                        <p className="font-medium text-foreground">{row.studentName}</p>
                        <p className="font-mono text-xs text-muted-foreground">
                          {row.admissionNumber}
                        </p>
                      </td>
                      <td className="py-2.5">
                        {row.response === 'CONSENTED' ? (
                          <Badge variant="success">Consented</Badge>
                        ) : row.response === 'DECLINED' ? (
                          <Badge variant="error">Declined</Badge>
                        ) : (
                          <Badge variant="outline">No response</Badge>
                        )}
                      </td>
                      <td className="py-2.5 text-muted-foreground">
                        {row.signatureName ? (
                          <>
                            <span className="italic">“{row.signatureName}”</span>
                            {row.guardianName && (
                              <span className="block text-xs">({row.guardianName})</span>
                            )}
                          </>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-2.5 text-xs tabular-nums text-muted-foreground">
                        {row.respondedAt
                          ? new Date(row.respondedAt).toLocaleString('en-GB', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
