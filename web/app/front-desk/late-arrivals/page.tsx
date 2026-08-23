import { PageHeader } from '@/components/dashboard/page-header';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { listLateArrivals } from '@/lib/actions/front-desk';
import { apiFetch } from '@/lib/api';
import type { StudentListResponse } from '@/lib/types/students';
import { LogLateArrivalForm } from './log-late-arrival-form';

export default async function LateArrivalsPage() {
  const [arrivals, studentsRes] = await Promise.all([
    listLateArrivals(),
    // 100 is the API's actual @Max(100) cap on pageSize (QueryStudentsDto)
    // — this was requesting 500 and 400ing on every load, breaking this
    // whole page (pre-existing, unrelated to Stage 29).
    apiFetch<StudentListResponse>('/students?pageSize=100'),
  ]);
  const studentOptions = studentsRes.data.map((s) => ({
    id: s.id,
    label: `${s.firstName} ${s.lastName} (${s.admissionNumber})`,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Late Arrivals"
        description="Log students arriving after the official start time — optionally alerting the Class Teacher."
      />

      <Card>
        <CardHeader>
          <CardTitle>Log a Late Arrival</CardTitle>
        </CardHeader>
        <CardContent>
          <LogLateArrivalForm studentOptions={studentOptions} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Today&apos;s Log ({arrivals.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {arrivals.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No late arrivals logged today.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {arrivals.map((arrival) => (
                <li key={arrival.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {arrival.student.firstName} {arrival.student.lastName}
                    </p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {arrival.student.admissionNumber}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {arrival.notifiedClassTeacher && (
                      <Badge variant="info">Teacher notified</Badge>
                    )}
                    <span className="tabular-nums text-sm text-muted-foreground">
                      {new Date(arrival.arrivalTime).toLocaleTimeString('en-GB', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
