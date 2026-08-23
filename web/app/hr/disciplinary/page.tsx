import { UserX } from 'lucide-react';
import { PageHeader } from '@/components/dashboard/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { listDisciplinaryRecords } from '@/lib/actions/hr';
import { apiFetch } from '@/lib/api';
import { formatLoggedAt } from '@/lib/format';
import type { StaffDto } from '@/lib/types/staff';
import { LogDisciplinaryForm } from './log-disciplinary-form';

export default async function DisciplinaryRecordsPage() {
  const [staff, records] = await Promise.all([
    apiFetch<StaffDto[]>('/staff'),
    listDisciplinaryRecords(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Disciplinary Records"
        description="Staff disciplinary incidents and warnings — separate from student discipline."
      />

      <Card>
        <CardHeader>
          <CardTitle>Log a Record</CardTitle>
        </CardHeader>
        <CardContent>
          <LogDisciplinaryForm staff={staff} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Log ({records.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {records.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <UserX />
                </EmptyMedia>
                <EmptyTitle>No disciplinary records</EmptyTitle>
                <EmptyDescription>Staff disciplinary incidents and warnings will appear here.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <ul className="divide-y divide-border">
              {records.map((r) => (
                <li key={r.id} className="space-y-1 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-foreground">
                      {r.staff?.firstName} {r.staff?.lastName}
                    </p>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {formatLoggedAt(r.loggedAt)}
                    </span>
                  </div>
                  <p className="text-sm text-foreground">{r.description}</p>
                  <p className="text-xs text-muted-foreground">Action: {r.actionTaken}</p>
                  <p className="text-xs text-muted-foreground">
                    Logged by {r.loggedBy?.firstName} {r.loggedBy?.lastName}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
