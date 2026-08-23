import { Download } from 'lucide-react';
import { PageHeader } from '@/components/dashboard/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { listVisitors } from '@/lib/actions/front-desk';
import { apiFetch } from '@/lib/api';
import type { StaffDto } from '@/lib/types/staff';
import { SignInForm } from './sign-in-form';
import { VisitorLog } from './visitor-log';

export default async function VisitorsPage() {
  const [visitors, staff] = await Promise.all([
    listVisitors(),
    apiFetch<StaffDto[]>('/staff'),
  ]);
  const staffOptions = staff
    .filter((s) => s.isActive)
    .map((s) => ({ id: s.id, name: `${s.firstName} ${s.lastName}` }));

  const signedIn = visitors.filter((v) => !v.signedOutAt);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Visitor Sign-In/Out"
        description="Every visitor on campus today, and who they're here to see."
        action={
          <Button variant="outline" size="sm" render={<a href="/api/front-desk-exports/visitors" download />}>
            <Download className="size-4" aria-hidden="true" />
            Export Excel
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Sign In a Visitor</CardTitle>
        </CardHeader>
        <CardContent>
          <SignInForm staffOptions={staffOptions} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Currently Signed In ({signedIn.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <VisitorLog visitors={signedIn} showSignOut />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Today&apos;s Full Log ({visitors.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <VisitorLog visitors={visitors} />
        </CardContent>
      </Card>
    </div>
  );
}
