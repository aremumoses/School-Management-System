import { ShieldCheck, Users } from 'lucide-react';
import { PageHeader } from '@/components/dashboard/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { listPickupPersons, listPickupRequests } from '@/lib/actions/front-desk';
import { apiFetch } from '@/lib/api';
import type { StudentListResponse } from '@/lib/types/students';
import { ChildSwitcher } from '../fees/child-switcher';
import { PickupPersonsManager } from './pickup-persons-manager';
import { RequestEarlyPickupForm } from './request-early-pickup-form';

export default async function PickupAuthorizationPage({
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
        <PageHeader title="Pickup Authorization" />
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

  const [persons, myRequests] = await Promise.all([
    listPickupPersons(selectedId),
    listPickupRequests(),
  ]);
  const childRequests = myRequests.filter((r) => r.studentId === selectedId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pickup Authorization"
        description={`Who is allowed to collect ${child.firstName} at the gate — the security desk checks against this exact list.`}
      />

      {children.length > 1 && (
        <ChildSwitcher
          options={children.map((c) => ({ id: c.id, label: `${c.firstName} ${c.lastName}` }))}
          selectedId={selectedId}
        />
      )}

      <div className="flex items-start gap-2 rounded-lg border border-info/30 bg-info-soft px-4 py-3 text-sm text-info-soft-foreground">
        <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>
          Anyone not on this list will be <strong>held at the gate</strong> until the school
          reaches you or an Admin approves the release. Keep names exactly as they appear on the
          person&apos;s ID.
        </span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Authorized Pickup Persons</CardTitle>
        </CardHeader>
        <CardContent>
          <PickupPersonsManager studentId={selectedId} persons={persons} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Request Early Pickup</CardTitle>
        </CardHeader>
        <CardContent>
          <RequestEarlyPickupForm
            studentId={selectedId}
            childName={child.firstName}
            requests={childRequests}
          />
        </CardContent>
      </Card>
    </div>
  );
}
