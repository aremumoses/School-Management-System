'use client';

import { CheckCircle2, Loader2, Plus, UserRound } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { StudentSearchBox } from '@/components/hostel-transport/student-search-box';
import type { StudentSearchRow } from '@/lib/actions/hostel-transport';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { logVisitation } from '@/lib/actions/hostel-transport';
import type { VisitationDto } from '@/lib/types/hostel-transport';

function nowLocalDateTime(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function LogForm() {
  const router = useRouter();
  const [student, setStudent] = useState<StudentSearchRow | null>(null);
  const [visitorName, setVisitorName] = useState('');
  const [relationship, setRelationship] = useState('');
  const [visitedAt, setVisitedAt] = useState(nowLocalDateTime());
  const [isSaving, setIsSaving] = useState(false);

  async function handleLog() {
    if (!student || !visitorName.trim() || !relationship.trim()) {
      return toast.error('Student, visitor name, and relationship are all required.');
    }
    setIsSaving(true);
    try {
      await logVisitation({
        studentId: student.id,
        visitorName: visitorName.trim(),
        relationship: relationship.trim(),
        visitedAt: new Date(visitedAt).toISOString(),
      });
      toast.success('Visit logged.');
      setStudent(null);
      setVisitorName('');
      setRelationship('');
      setVisitedAt(nowLocalDateTime());
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't log this visit.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Boarder</Label>
        <StudentSearchBox onSelect={setStudent} />
        {student && (
          <p className="text-sm text-foreground">
            Visiting: <span className="font-medium">{student.firstName} {student.lastName}</span>
          </p>
        )}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="visitor-name">Visitor name</Label>
          <Input id="visitor-name" value={visitorName} onChange={(e) => setVisitorName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="visitor-relationship">Relationship</Label>
          <Input
            id="visitor-relationship"
            value={relationship}
            onChange={(e) => setRelationship(e.target.value)}
            placeholder="Mother, Uncle, Friend…"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="visited-at">Time</Label>
          <Input
            id="visited-at"
            type="datetime-local"
            value={visitedAt}
            onChange={(e) => setVisitedAt(e.target.value)}
          />
        </div>
      </div>
      <div className="flex justify-end">
        <Button onClick={() => void handleLog()} disabled={isSaving}>
          {isSaving ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Plus className="size-4" aria-hidden="true" />
          )}
          Log Visit
        </Button>
      </div>
    </div>
  );
}

export function VisitationView({ visitations }: { visitations: VisitationDto[] }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Log a Visit</CardTitle>
        </CardHeader>
        <CardContent>
          <LogForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>History ({visitations.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {visitations.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <UserRound />
                </EmptyMedia>
                <EmptyTitle>No visits logged</EmptyTitle>
                <EmptyDescription>Visits you log will appear here.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <ul className="divide-y divide-border">
              {visitations.map((v) => (
                <li key={v.id} className="space-y-1 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-foreground">
                      {v.student.firstName} {v.student.lastName}
                    </p>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {new Date(v.visitedAt).toLocaleString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {v.visitorName} ({v.relationship})
                    {v.matchedAuthorizedPickupPerson && (
                      <Badge variant="info" className="ml-1.5 text-xs">
                        <CheckCircle2 className="size-3" aria-hidden="true" />
                        On pickup list
                      </Badge>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Logged by {v.loggedBy.firstName} {v.loggedBy.lastName}
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
