'use client';

import { Loader2, MapPin, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { StudentSearchBox } from '@/components/hostel-transport/student-search-box';
import type { StudentSearchRow } from '@/lib/actions/hostel-transport';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { assignStudentToRoute, removeRouteAssignment } from '@/lib/actions/hostel-transport';
import type {
  StudentRouteAssignmentDto,
  TransportRouteDto,
} from '@/lib/types/hostel-transport';

function AssignForm({ routes }: { routes: TransportRouteDto[] }) {
  const router = useRouter();
  const [student, setStudent] = useState<StudentSearchRow | null>(null);
  const [routeId, setRouteId] = useState('');
  const [stopId, setStopId] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const selectedRoute = routes.find((r) => r.id === routeId);

  async function handleAssign() {
    if (!student || !routeId || !stopId) {
      return toast.error('Choose a student, route, and stop.');
    }
    setIsSaving(true);
    try {
      await assignStudentToRoute({ studentId: student.id, routeId, stopId });
      toast.success(`${student.firstName} ${student.lastName} assigned.`);
      setStudent(null);
      setRouteId('');
      setStopId('');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't assign this student.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <StudentSearchBox onSelect={setStudent} />
        {student && (
          <p className="text-sm text-foreground">
            Assigning: <span className="font-medium">{student.firstName} {student.lastName}</span>
          </p>
        )}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Select
          value={routeId}
          onValueChange={(v) => {
            setRouteId(v ?? '');
            setStopId('');
          }}
          items={routes.map((r) => ({ value: r.id, label: r.name }))}
        >
          <SelectTrigger className="w-full" aria-label="Route">
            <SelectValue placeholder="Choose a route…" />
          </SelectTrigger>
          <SelectContent>
            {routes.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {r.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={stopId}
          onValueChange={(v) => setStopId(v ?? '')}
          items={(selectedRoute?.stops ?? []).map((s) => ({ value: s.id, label: s.stopName }))}
        >
          <SelectTrigger className="w-full" aria-label="Stop">
            <SelectValue placeholder={selectedRoute ? 'Choose a stop…' : 'Pick a route first'} />
          </SelectTrigger>
          <SelectContent>
            {(selectedRoute?.stops ?? []).map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.stopName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex justify-end">
        <Button onClick={() => void handleAssign()} disabled={isSaving}>
          {isSaving ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : 'Assign'}
        </Button>
      </div>
    </div>
  );
}

export function RouteAssignmentView({
  assignments,
  routes,
}: {
  assignments: StudentRouteAssignmentDto[];
  routes: TransportRouteDto[];
}) {
  const router = useRouter();
  const [removingId, setRemovingId] = useState<string | null>(null);

  async function handleRemove(studentId: string) {
    setRemovingId(studentId);
    try {
      await removeRouteAssignment(studentId);
      toast.success('Assignment removed.');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't remove this assignment.");
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Assign a Student</CardTitle>
        </CardHeader>
        <CardContent>
          <AssignForm routes={routes} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Assignments ({assignments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {assignments.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <MapPin />
                </EmptyMedia>
                <EmptyTitle>No students assigned yet</EmptyTitle>
                <EmptyDescription>Assign a student above.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <ul className="divide-y divide-border">
              {assignments.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <p className="font-medium text-foreground">
                      {a.student.firstName} {a.student.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {a.route.name} — {a.stop.stopName}
                      {a.stop.approximateTime && ` (${a.stop.approximateTime})`}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => void handleRemove(a.studentId)}
                    disabled={removingId === a.studentId}
                    aria-label="Remove assignment"
                  >
                    {removingId === a.studentId ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <Trash2 className="size-4" aria-hidden="true" />
                    )}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
