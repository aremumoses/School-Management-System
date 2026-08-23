'use client';

import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { convertApplicant } from '@/lib/actions/admissions';

interface ArmOption {
  id: string;
  name: string;
  classId: string;
}

interface ClassOption {
  id: string;
  name: string;
  arms: ArmOption[];
}

export function ConvertForm({
  applicantId,
  classes,
}: {
  applicantId: string;
  classes: ClassOption[];
}) {
  const router = useRouter();
  const [classId, setClassId] = useState('');
  const [armId, setArmId] = useState('');
  const [admissionNumber, setAdmissionNumber] = useState('');
  const [isPending, setIsPending] = useState(false);
  const [converted, setConverted] = useState<{
    studentId: string;
    temporaryPassword: string;
  } | null>(null);

  const selectedClass = classes.find((c) => c.id === classId);
  const arms = selectedClass?.arms ?? [];

  async function submit() {
    if (!classId || !armId) {
      toast.error('Select a class and arm to proceed.');
      return;
    }
    setIsPending(true);
    try {
      const result = await convertApplicant(applicantId, {
        classId,
        armId,
        admissionNumber: admissionNumber.trim() || undefined,
      });
      setConverted(result);
      toast.success('Applicant converted to enrolled student successfully.');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Conversion failed.');
    } finally {
      setIsPending(false);
    }
  }

  if (converted) {
    return (
      <Card className="border-success-soft bg-success-soft/20">
        <CardHeader>
          <CardTitle className="text-success-soft-foreground">Student enrolled!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-success-soft-foreground">
            A portal account has been created and login credentials sent to the
            guardian by SMS and email.
          </p>
          <div className="rounded-lg border border-border bg-card p-3 text-sm">
            <p className="text-muted-foreground">Temporary password (one-time):</p>
            <p className="mt-0.5 font-mono font-semibold">{converted.temporaryPassword}</p>
          </div>
          <Button
            size="sm"
            render={<Link href={`/admin/students/${converted.studentId}`} />}
          >
            View Student Profile
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Convert to Enrolled Student</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Creates a student record, assigns the class, and sends the guardian their portal
          login credentials.
        </p>
        <div className="space-y-1.5">
          <Label htmlFor="classId">Class</Label>
          <Select
            value={classId}
            onValueChange={(v) => {
              if (v) { setClassId(v); setArmId(''); }
            }}
            items={classes.map((c) => ({ value: c.id, label: c.name }))}
          >
            <SelectTrigger id="classId" className="w-full">
              <SelectValue placeholder="Select a class" />
            </SelectTrigger>
            <SelectContent>
              {classes.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="armId">Arm</Label>
          <Select
            value={armId}
            onValueChange={(v) => v && setArmId(v)}
            items={arms.map((a) => ({ value: a.id, label: a.name }))}
          >
            <SelectTrigger id="armId" className="w-full" disabled={!classId}>
              <SelectValue placeholder={classId ? 'Select an arm' : 'Select a class first'} />
            </SelectTrigger>
            <SelectContent>
              {arms.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="admNo">Admission number (optional — auto-generated if blank)</Label>
          <Input
            id="admNo"
            value={admissionNumber}
            onChange={(e) => setAdmissionNumber(e.target.value)}
            placeholder="Auto-generated"
          />
        </div>

        <Button
          type="button"
          disabled={isPending || !classId || !armId}
          onClick={() => void submit()}
        >
          {isPending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            'Enroll Student'
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
