'use client';

import { AlertTriangle, Check, CheckCircle2, Download, FileSpreadsheet, Upload } from 'lucide-react';
import { type ReactNode, useRef, useState } from 'react';
import { toast } from 'sonner';
import { FormFieldLabel } from '@/components/dashboard/form-field-label';
import { Stepper } from '@/components/dashboard/stepper';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { AcademicSessionDto, ClassDto, SubjectDto } from '@/lib/types/academic';
import { cn } from '@/lib/utils';

interface ScoreBulkEntry {
  studentId: string;
  assessmentComponentId: string;
  score: number;
}

interface ScoreBulkError {
  studentId: string;
  componentId: string;
  message: string;
}

interface ScoreBulkPreviewResult {
  classSubjectId: string;
  termId: string;
  valid: ScoreBulkEntry[];
  errors: ScoreBulkError[];
  totalRows: number;
}

const STEPS = ['Select Class/Subject', 'Upload', 'Review', 'Confirm'];

/** One wizard step: a white card with a title row and an optional footer of buttons. */
function StepCard({
  title,
  description,
  footer,
  children,
}: {
  title: string;
  description?: string;
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl bg-card dark:ring-1 dark:ring-foreground/10">
      <div className="border-b border-border px-5 py-4 sm:px-6">
        <h2 className="text-lg leading-snug font-semibold text-heading">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
      </div>
      <div className="space-y-5 px-5 py-5 sm:px-6">{children}</div>
      {footer && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-5 py-4 sm:px-6">
          {footer}
        </div>
      )}
    </section>
  );
}

export function ScoresImportWizard({
  sessions,
  classes,
  subjects,
}: {
  sessions: AcademicSessionDto[];
  classes: ClassDto[];
  subjects: SubjectDto[];
}) {
  const [step, setStep] = useState(1);
  const [termId, setTermId] = useState('');
  const [classSubjectId, setClassSubjectId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [preview, setPreview] = useState<ScoreBulkPreviewResult | null>(null);
  const [commitResult, setCommitResult] = useState<{ upserted: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const allTerms = sessions.flatMap((s) =>
    s.terms.map((t) => ({ ...t, sessionName: s.name })),
  );

  // Derive class/subject options from subjects' classSubjects, cross-referenced with classes
  const classNameMap = new Map(classes.map((c) => [c.id, c.name]));
  const classSubjects = subjects.flatMap((subject) =>
    subject.classSubjects.map((cs) => ({
      id: cs.id,
      label: `${classNameMap.get(cs.classId) ?? cs.classId} — ${subject.name}`,
    })),
  ).sort((a, b) => a.label.localeCompare(b.label));

  function handleFile(selected: File | undefined) {
    if (!selected) return;
    const isExcel =
      selected.name.endsWith('.xlsx') ||
      selected.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    if (!isExcel) { toast.error('Please choose a .xlsx spreadsheet.'); return; }
    setFile(selected);
  }

  const templateHref =
    classSubjectId && termId
      ? `/api/scores/bulk-import/template?classSubjectId=${classSubjectId}&termId=${termId}`
      : '#';

  async function handleUploadContinue() {
    if (!file) { toast.error('Choose a spreadsheet first.'); return; }
    if (!classSubjectId || !termId) { toast.error('Select class/subject and term first.'); return; }
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.set('file', file);
      const res = await fetch(
        `/api/scores/bulk-import/preview?classSubjectId=${classSubjectId}&termId=${termId}`,
        { method: 'POST', body: formData },
      );
      if (!res.ok) {
        const err = await res.json() as { message?: string };
        throw new Error(err.message ?? 'Failed to preview.');
      }
      const result = await res.json() as ScoreBulkPreviewResult;
      setPreview(result);
      setStep(3);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to read this spreadsheet.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCommit() {
    if (!preview) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/scores/bulk-import/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classSubjectId,
          termId,
          entries: preview.valid,
        }),
      });
      if (!res.ok) {
        const err = await res.json() as { message?: string };
        throw new Error(err.message ?? 'Import failed.');
      }
      const result = await res.json() as { upserted: number };
      setCommitResult(result);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to import scores.');
    } finally {
      setIsLoading(false);
    }
  }

  if (commitResult) {
    return (
      <section className="mx-auto max-w-lg space-y-5 rounded-xl bg-card px-6 py-8 text-center dark:ring-1 dark:ring-foreground/10">
        <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-success-soft text-success-soft-foreground">
          <Check className="size-8" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-xl font-semibold text-heading">Import complete</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {commitResult.upserted} score{commitResult.upserted === 1 ? '' : 's'} upserted
            successfully.
          </p>
        </div>
        <Button variant="outline" onClick={() => { setStep(1); setCommitResult(null); setPreview(null); setFile(null); }}>
          Import Another Sheet
        </Button>
      </section>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <Stepper steps={STEPS} currentStep={step} />

      {step === 1 && (
        <StepCard
          title="Choose a class and subject"
          description="Scores are imported for one term, class and subject at a time."
          footer={
            <Button
              className="ml-auto h-10 px-5"
              onClick={() => setStep(2)}
              disabled={!classSubjectId || !termId}
            >
              Continue
            </Button>
          }
        >
          <div className="space-y-2">
            <FormFieldLabel htmlFor="import-term" required>
              Term
            </FormFieldLabel>
            <Select value={termId} onValueChange={(v) => { if (v) { setTermId(v); setClassSubjectId(''); } }} items={allTerms.map((t) => ({ value: t.id, label: `${t.sessionName} — ${t.name}${t.isCurrent ? ' (current)' : ''}` }))}>
              <SelectTrigger id="import-term" className="w-full data-[size=default]:h-10">
                <SelectValue placeholder="Choose a term…" />
              </SelectTrigger>
              <SelectContent>
                {allTerms.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.sessionName} — {t.name}{t.isCurrent ? ' (current)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <FormFieldLabel htmlFor="import-class-subject" required>
              Class / Subject
            </FormFieldLabel>
            <Select value={classSubjectId} onValueChange={(v) => { if (v) setClassSubjectId(v); }} items={classSubjects.map((cs) => ({ value: cs.id, label: cs.label }))}>
              <SelectTrigger id="import-class-subject" className="w-full data-[size=default]:h-10" disabled={!termId}>
                <SelectValue placeholder="Choose a class/subject…" />
              </SelectTrigger>
              <SelectContent>
                {classSubjects.map((cs) => (
                  <SelectItem key={cs.id} value={cs.id}>
                    {cs.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {termId && classSubjects.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No class/subject combinations found. Set up Classes, Subjects, and Curriculum
                first.
              </p>
            )}
          </div>
        </StepCard>
      )}

      {step === 2 && (
        <StepCard
          title="Upload the spreadsheet"
          description="Download the pre-filled template, add the scores, then upload it here."
          footer={
            <>
              <Button variant="outline" className="h-10 px-5" onClick={() => setStep(1)}>Back</Button>
              <Button className="h-10 px-5" onClick={() => void handleUploadContinue()} disabled={isLoading}>
                {isLoading ? 'Reading file…' : 'Continue'}
              </Button>
            </>
          }
        >
          <div
            role="button"
            tabIndex={0}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click(); }}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFile(e.dataTransfer.files[0]); }}
            className={cn(
              'flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border px-6 py-10 text-center transition-colors hover:border-primary hover:bg-primary/5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
              isDragging && 'border-primary bg-primary/5',
            )}
          >
            <span className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              {file ? (
                <FileSpreadsheet className="size-6" aria-hidden="true" />
              ) : (
                <Upload className="size-6" aria-hidden="true" />
              )}
            </span>
            {file ? (
              <div>
                <p className="font-semibold break-all text-heading">{file.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">Click or drop to choose a different file</p>
              </div>
            ) : (
              <div>
                <p className="font-semibold text-heading">Drag and drop your scores spreadsheet here</p>
                <p className="mt-0.5 text-xs text-muted-foreground">or click to browse — .xlsx only</p>
              </div>
            )}
            <input ref={inputRef} type="file" accept=".xlsx" className="sr-only" onChange={(e) => handleFile(e.target.files?.[0])} />
          </div>

          {classSubjectId && termId && (
            <a
              href={templateHref}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline dark:text-foreground"
            >
              <Download className="size-4" aria-hidden="true" />
              Download pre-filled template for this class/subject/term
            </a>
          )}
        </StepCard>
      )}

      {step === 3 && preview && (
        <StepCard
          title="Review"
          description={`Checked ${preview.totalRows} student row${preview.totalRows === 1 ? '' : 's'}. Entries with errors will be skipped.`}
          footer={
            <>
              <Button variant="outline" className="h-10 px-5" onClick={() => setStep(2)}>Back</Button>
              <Button className="h-10 px-5" onClick={() => setStep(4)} disabled={preview.valid.length === 0}>Continue</Button>
            </>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-3 rounded-xl bg-success-soft px-4 py-3 text-success-soft-foreground">
              <CheckCircle2 className="size-5 shrink-0" aria-hidden="true" />
              <p>
                <span className="block text-xl font-semibold tabular-nums">{preview.valid.length}</span>
                <span className="block text-xs">valid entries</span>
              </p>
            </div>
            <div
              className={cn(
                'flex items-center gap-3 rounded-xl px-4 py-3',
                preview.errors.length > 0
                  ? 'bg-error-soft text-error-soft-foreground'
                  : 'bg-muted text-muted-foreground',
              )}
            >
              <AlertTriangle className="size-5 shrink-0" aria-hidden="true" />
              <p>
                <span className="block text-xl font-semibold tabular-nums">{preview.errors.length}</span>
                <span className="block text-xs">errors</span>
              </p>
            </div>
          </div>

          {preview.errors.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-error-soft">
              <p className="bg-error-soft px-4 py-2.5 text-sm font-medium text-error-soft-foreground">
                Validation errors (entries will be skipped)
              </p>
              <ul className="divide-y divide-border">
                {preview.errors.map((e, i) => (
                  <li key={i} className="px-4 py-2.5 text-sm text-muted-foreground">
                    <span className="font-mono text-xs text-heading">Student {e.studentId.slice(0, 8)}…</span>
                    {' · '}
                    {e.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </StepCard>
      )}

      {step === 4 && preview && (
        <StepCard
          title="Confirm import"
          footer={
            <>
              <Button variant="outline" className="h-10 px-5" onClick={() => setStep(3)}>Back to Review</Button>
              <Button className="h-10 px-5" onClick={() => void handleCommit()} disabled={isLoading}>
                {isLoading ? 'Importing…' : 'Confirm Import'}
              </Button>
            </>
          }
        >
          <div className="space-y-2 py-2 text-center">
            <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <FileSpreadsheet className="size-6" aria-hidden="true" />
            </span>
            <p className="text-lg font-semibold text-heading">
              {preview.valid.length} score entr{preview.valid.length === 1 ? 'y' : 'ies'} ready to upsert
            </p>
            {preview.errors.length > 0 && (
              <p className="text-sm text-muted-foreground">
                {preview.errors.length} entr{preview.errors.length === 1 ? 'y' : 'ies'} with errors will be skipped.
              </p>
            )}
          </div>
          <p className="flex items-start gap-2 rounded-xl bg-warning-soft px-4 py-3 text-sm text-warning-soft-foreground">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            Existing scores for the same student+component will be overwritten.
          </p>
        </StepCard>
      )}
    </div>
  );
}
