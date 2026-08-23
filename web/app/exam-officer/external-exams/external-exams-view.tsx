'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { Download, FileSearch, Loader2, Plus } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { DataTable } from '@/components/dashboard/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  createExternalExamCandidate,
  updateExternalExamCandidate,
} from '@/lib/actions/exam-logistics';
import type {
  ExternalExamBody,
  ExternalExamCandidateDto,
  ExternalExamCandidateStatus,
} from '@/lib/types/exam-logistics';
import { CaSummaryDialog } from './ca-summary-dialog';

const EXAM_BODIES: ExternalExamBody[] = ['BECE', 'WAEC', 'NECO', 'NABTEB', 'JAMB'];
const STATUS_OPTIONS: { value: ExternalExamCandidateStatus; label: string }[] = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'REGISTERED', label: 'Registered' },
  { value: 'WITHDRAWN', label: 'Withdrawn' },
];

function RegisterCandidateDialog({
  students,
}: {
  students: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [studentId, setStudentId] = useState('');
  const [examBody, setExamBody] = useState<ExternalExamBody>('WAEC');
  const [sessionYear, setSessionYear] = useState(String(new Date().getFullYear()));
  const [combination, setCombination] = useState('');
  const [regNumber, setRegNumber] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  function reset() {
    setStudentId('');
    setExamBody('WAEC');
    setSessionYear(String(new Date().getFullYear()));
    setCombination('');
    setRegNumber('');
  }

  async function handleCreate() {
    const subjects = combination
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (!studentId || subjects.length === 0) {
      return toast.error('Choose a student and at least one subject.');
    }
    setIsSaving(true);
    try {
      await createExternalExamCandidate({
        studentId,
        examBody,
        sessionYear: Number(sessionYear),
        subjectCombination: subjects,
        registrationNumber: regNumber.trim() || undefined,
      });
      toast.success('Candidate registered.');
      reset();
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't register this candidate.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger render={<Button />}>
        <Plus className="size-4" aria-hidden="true" />
        Register Candidate
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Register a candidate</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Student</Label>
            <Select
              value={studentId}
              onValueChange={(v) => setStudentId(v ?? '')}
              items={students.map((s) => ({ value: s.id, label: s.name }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose…" />
              </SelectTrigger>
              <SelectContent>
                {students.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Exam body</Label>
              <Select
                value={examBody}
                onValueChange={(v) => {
                  if (v) setExamBody(v as ExternalExamBody);
                }}
                items={EXAM_BODIES.map((b) => ({ value: b, label: b }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXAM_BODIES.map((b) => (
                    <SelectItem key={b} value={b}>
                      {b}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ee-year">Session year</Label>
              <Input
                id="ee-year"
                type="number"
                value={sessionYear}
                onChange={(e) => setSessionYear(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ee-combo">Subject combination (comma-separated)</Label>
            <Input
              id="ee-combo"
              value={combination}
              onChange={(e) => setCombination(e.target.value)}
              placeholder="Mathematics, English Language, Physics, Chemistry, Biology"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ee-reg">Registration number (optional)</Label>
            <Input id="ee-reg" value={regNumber} onChange={(e) => setRegNumber(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={() => void handleCreate()} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              'Register'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StatusCell({ candidate }: { candidate: ExternalExamCandidateDto }) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);

  async function handleChange(value: string | null) {
    if (!value || value === candidate.status) return;
    setIsSaving(true);
    try {
      await updateExternalExamCandidate(candidate.id, {
        status: value as ExternalExamCandidateStatus,
      });
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't update status.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Select value={candidate.status} onValueChange={handleChange} items={STATUS_OPTIONS}>
      <SelectTrigger className="h-8 w-32 text-xs" disabled={isSaving}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {STATUS_OPTIONS.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function Filters({
  initialExamBody,
  initialSessionYear,
}: {
  initialExamBody: string;
  initialSessionYear: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [examBody, setExamBody] = useState(initialExamBody);
  const [sessionYear, setSessionYear] = useState(initialSessionYear);

  function apply(nextExamBody: string, nextSessionYear: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (nextExamBody) params.set('examBody', nextExamBody);
    else params.delete('examBody');
    if (nextSessionYear) params.set('sessionYear', nextSessionYear);
    else params.delete('sessionYear');
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={examBody}
        onValueChange={(v) => {
          const next = v ?? '';
          setExamBody(next);
          apply(next, sessionYear);
        }}
        items={[{ value: '', label: 'All exam bodies' }, ...EXAM_BODIES.map((b) => ({ value: b, label: b }))]}
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder="All exam bodies" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">All exam bodies</SelectItem>
          {EXAM_BODIES.map((b) => (
            <SelectItem key={b} value={b}>
              {b}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        type="number"
        value={sessionYear}
        onChange={(e) => {
          setSessionYear(e.target.value);
        }}
        onBlur={() => apply(examBody, sessionYear)}
        placeholder="Session year"
        className="w-32"
        aria-label="Session year"
      />
      <Button
        variant="outline"
        size="sm"
        render={
          <a
            href={`/api/external-exams-export${
              examBody || sessionYear
                ? `?${new URLSearchParams({
                    ...(examBody && { examBody }),
                    ...(sessionYear && { sessionYear }),
                  }).toString()}`
                : ''
            }`}
            download
          />
        }
      >
        <Download className="size-4" aria-hidden="true" />
        Export Registration Data
      </Button>
    </div>
  );
}

export function ExternalExamsView({
  candidates,
  students,
  initialExamBody,
  initialSessionYear,
}: {
  candidates: ExternalExamCandidateDto[];
  students: { id: string; name: string }[];
  initialExamBody: string;
  initialSessionYear: string;
}) {
  const [caSummaryFor, setCaSummaryFor] = useState<{ id: string; label: string } | null>(null);

  const columns: ColumnDef<ExternalExamCandidateDto, unknown>[] = [
    {
      id: 'student',
      header: 'Student',
      accessorFn: (row) => `${row.student.firstName} ${row.student.lastName}`,
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-foreground">
            {row.original.student.firstName} {row.original.student.lastName}
          </p>
          <p className="text-xs text-muted-foreground">{row.original.student.admissionNumber}</p>
        </div>
      ),
    },
    {
      id: 'examBody',
      header: 'Exam Body',
      accessorFn: (row) => row.examBody,
      cell: ({ row }) => <Badge variant="outline">{row.original.examBody}</Badge>,
    },
    {
      id: 'sessionYear',
      header: 'Session',
      accessorFn: (row) => row.sessionYear,
    },
    {
      id: 'combination',
      header: 'Subject Combination',
      accessorFn: (row) => row.subjectCombination.join(', '),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.subjectCombination.join(', ')}
        </span>
      ),
    },
    {
      id: 'registrationNumber',
      header: 'Reg. No.',
      accessorFn: (row) => row.registrationNumber ?? '—',
    },
    {
      id: 'status',
      header: 'Status',
      accessorFn: (row) => row.status,
      cell: ({ row }) => <StatusCell candidate={row.original} />,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            setCaSummaryFor({
              id: row.original.studentId,
              label: `${row.original.student.firstName} ${row.original.student.lastName}`,
            })
          }
        >
          <FileSearch className="size-3.5" aria-hidden="true" />
          CA Summary
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Filters initialExamBody={initialExamBody} initialSessionYear={initialSessionYear} />
        <RegisterCandidateDialog students={students} />
      </div>

      {candidates.length === 0 ? (
        <Empty className="border border-dashed border-border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileSearch />
            </EmptyMedia>
            <EmptyTitle>No candidates registered</EmptyTitle>
            <EmptyDescription>
              Register a candidate for BECE, WAEC, NECO, NABTEB, or JAMB above.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <DataTable columns={columns} data={candidates} searchPlaceholder="Search candidates…" />
      )}

      {caSummaryFor && (
        <CaSummaryDialog
          studentId={caSummaryFor.id}
          studentLabel={caSummaryFor.label}
          onClose={() => setCaSummaryFor(null)}
        />
      )}
    </div>
  );
}
