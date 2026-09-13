'use client';

import { CheckCircle2, GraduationCap, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { FormFieldLabel } from '@/components/dashboard/form-field-label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

export interface ClassOption {
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
      <section className="space-y-4 rounded-xl border border-success-soft bg-success-soft p-5 text-success-soft-foreground sm:p-6">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <div>
            <h2 className="text-lg font-semibold">Student enrolled!</h2>
            <p className="text-sm">
              A portal account has been created and login credentials sent to the
              guardian by SMS and email.
            </p>
          </div>
        </div>
        <div className="rounded-xl bg-card p-4 text-sm">
          <p className="text-muted-foreground">Temporary password (one-time):</p>
          <p className="mt-0.5 font-mono text-base font-semibold text-heading">
            {converted.temporaryPassword}
          </p>
        </div>
        <Button render={<Link href={`/admin/students/${converted.studentId}`} />}>
          View Student Profile
        </Button>
      </section>
    );
  }

  return (
    <section className="rounded-xl bg-card p-5 sm:p-6 dark:ring-1 dark:ring-foreground/10">
      <div className="mb-5 flex items-start gap-4">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <GraduationCap className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 className="text-lg leading-snug font-semibold text-heading">
            Convert to Enrolled Student
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Creates a student record, assigns the class, and sends the guardian their portal
            login credentials.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <FormFieldLabel htmlFor="classId" required>
            Class
          </FormFieldLabel>
          <Select
            value={classId}
            onValueChange={(v) => {
              if (v) { setClassId(v); setArmId(''); }
            }}
            items={classes.map((c) => ({ value: c.id, label: c.name }))}
          >
            <SelectTrigger id="classId" className="w-full data-[size=default]:h-10">
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

        <div className="space-y-2">
          <FormFieldLabel htmlFor="armId" required>
            Arm
          </FormFieldLabel>
          <Select
            value={armId}
            onValueChange={(v) => v && setArmId(v)}
            items={arms.map((a) => ({ value: a.id, label: a.name }))}
          >
            <SelectTrigger id="armId" className="w-full data-[size=default]:h-10" disabled={!classId}>
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

        <div className="space-y-2">
          <FormFieldLabel htmlFor="admNo">Admission number (optional)</FormFieldLabel>
          <Input
            id="admNo"
            value={admissionNumber}
            onChange={(e) => setAdmissionNumber(e.target.value)}
            placeholder="Auto-generated"
            aria-describedby="admNo-hint"
            className="h-10"
          />
          <p id="admNo-hint" className="text-xs text-muted-foreground">
            Generated automatically if left blank.
          </p>
        </div>
      </div>

      <div className="mt-5 flex justify-end">
        <Button
          type="button"
          className="h-10 px-5"
          disabled={isPending || !classId || !armId}
          onClick={() => void submit()}
        >
          {isPending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            'Enroll Student'
          )}
        </Button>
      </div>
    </section>
  );
}
