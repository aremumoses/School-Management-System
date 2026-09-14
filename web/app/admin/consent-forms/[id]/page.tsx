import { getConsentResponses, listConsentForms } from '@/lib/actions/clubs';
import { ConsentFormDetailView } from './consent-form-detail-view';

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

  return <ConsentFormDetailView form={form} result={result} />;
}
