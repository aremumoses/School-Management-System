import { Download } from 'lucide-react';
import { auth } from '@/auth';
import { PageHeader } from '@/components/dashboard/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { listGatePasses, listPickupRequests } from '@/lib/actions/front-desk';
import { apiFetch } from '@/lib/api';
import type { StudentListResponse } from '@/lib/types/students';
import { GatePassLog } from './gate-pass-log';
import { VerifyPickupForm } from './verify-pickup-form';

export default async function GatePassPage() {
  const session = await auth();
  const isAdmin = session?.user.roles.includes('ADMIN') ?? false;

  const [passes, requests, studentsRes] = await Promise.all([
    listGatePasses(),
    listPickupRequests(),
    // 100 is the API's actual @Max(100) cap on pageSize (QueryStudentsDto)
    // — this was requesting 500 and 400ing on every load, so the whole
    // page was actually broken before this fix, not just newly touched by
    // Stage 29's changes.
    apiFetch<StudentListResponse>('/students?pageSize=100'),
  ]);
  const studentOptions = studentsRes.data.map((s) => ({
    id: s.id,
    label: `${s.firstName} ${s.lastName} (${s.admissionNumber})`,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gate Pass / Pickup Verification"
        description="Check the pickup person against the parent's authorized list before releasing any student."
        action={
          <Button variant="outline" size="sm" render={<a href="/api/front-desk-exports/gate-pass" download />}>
            <Download className="size-4" aria-hidden="true" />
            Export Excel
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Verify &amp; Issue</CardTitle>
        </CardHeader>
        <CardContent>
          <VerifyPickupForm studentOptions={studentOptions} pendingRequests={requests} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Today&apos;s Gate Passes ({passes.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <GatePassLog passes={passes} isAdmin={isAdmin} />
        </CardContent>
      </Card>
    </div>
  );
}
