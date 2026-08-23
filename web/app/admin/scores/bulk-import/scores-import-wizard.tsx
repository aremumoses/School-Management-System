'use client';

import { Check, Download, FileSpreadsheet, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Stepper } from '@/components/dashboard/stepper';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
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
      <Card className="mx-auto max-w-lg">
        <CardContent className="space-y-4 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-success-soft">
            <Check className="size-6 text-success-soft-foreground" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">Import complete</h2>
            <p className="text-sm text-muted-foreground">
              {commitResult.upserted} score{commitResult.upserted === 1 ? '' : 's'} upserted
              successfully.
            </p>
          </div>
          <Button variant="outline" onClick={() => { setStep(1); setCommitResult(null); setPreview(null); setFile(null); }}>
            Import Another Sheet
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <Stepper steps={STEPS} currentStep={step} />

      {step === 1 && (
        <Card>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Term</Label>
              <Select value={termId} onValueChange={(v) => { if (v) { setTermId(v); setClassSubjectId(''); } }} items={allTerms.map((t) => ({ value: t.id, label: `${t.sessionName} — ${t.name}${t.isCurrent ? ' (current)' : ''}` }))}>
                <SelectTrigger className="w-full">
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
              <Label>Class / Subject</Label>
              <Select value={classSubjectId} onValueChange={(v) => { if (v) setClassSubjectId(v); }} items={classSubjects.map((cs) => ({ value: cs.id, label: cs.label }))}>
                <SelectTrigger className="w-full" disabled={!termId}>
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

            <div className="flex justify-end border-t border-border pt-4">
              <Button
                onClick={() => setStep(2)}
                disabled={!classSubjectId || !termId}
              >
                Continue
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardContent className="space-y-6">
            <div
              role="button"
              tabIndex={0}
              onClick={() => inputRef.current?.click()}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click(); }}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFile(e.dataTransfer.files[0]); }}
              className={cn(
                'flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border p-10 text-center text-muted-foreground transition-colors hover:border-primary hover:text-primary',
                isDragging && 'border-primary bg-primary/5 text-primary',
              )}
            >
              {file ? (
                <>
                  <FileSpreadsheet className="size-8" aria-hidden="true" />
                  <p className="font-medium text-foreground">{file.name}</p>
                  <p className="text-xs">Click or drop to choose a different file</p>
                </>
              ) : (
                <>
                  <Upload className="size-8" aria-hidden="true" />
                  <p className="font-medium">Drag and drop your scores spreadsheet here</p>
                  <p className="text-xs">or click to browse — .xlsx only</p>
                </>
              )}
              <input ref={inputRef} type="file" accept=".xlsx" className="sr-only" onChange={(e) => handleFile(e.target.files?.[0])} />
            </div>

            {classSubjectId && termId && (
              <a
                href={templateHref}
                className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
              >
                <Download className="size-3.5" aria-hidden="true" />
                Download pre-filled template for this class/subject/term
              </a>
            )}

            <div className="flex justify-between border-t border-border pt-4">
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button onClick={() => void handleUploadContinue()} disabled={isLoading}>
                {isLoading ? 'Reading file…' : 'Continue'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && preview && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Badge variant="success">{preview.valid.length} valid entries</Badge>
            {preview.errors.length > 0 && (
              <Badge variant="error">{preview.errors.length} errors</Badge>
            )}
            <span className="text-sm text-muted-foreground">
              across {preview.totalRows} student rows
            </span>
          </div>

          {preview.errors.length > 0 && (
            <div className="overflow-hidden rounded-lg border border-error-soft">
              <div className="bg-error-soft px-3 py-2 text-xs font-medium text-error-soft-foreground">
                Validation errors (entries will be skipped)
              </div>
              <ul className="divide-y divide-border px-3">
                {preview.errors.map((e, i) => (
                  <li key={i} className="py-1.5 text-xs text-muted-foreground">
                    Student {e.studentId.slice(0, 8)}… · {e.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
            <Button onClick={() => setStep(4)} disabled={preview.valid.length === 0}>Continue</Button>
          </div>
        </div>
      )}

      {step === 4 && preview && (
        <Card>
          <CardContent className="space-y-6 text-center">
            <p className="text-lg font-medium text-foreground">
              {preview.valid.length} score entr{preview.valid.length === 1 ? 'y' : 'ies'} ready to upsert
            </p>
            {preview.errors.length > 0 && (
              <p className="text-sm text-muted-foreground">
                {preview.errors.length} entr{preview.errors.length === 1 ? 'y' : 'ies'} with errors will be skipped.
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              Existing scores for the same student+component will be overwritten.
            </p>
            <div className="flex justify-center gap-2 border-t border-border pt-4">
              <Button variant="outline" onClick={() => setStep(3)}>Back to Review</Button>
              <Button onClick={() => void handleCommit()} disabled={isLoading}>
                {isLoading ? 'Importing…' : 'Confirm Import'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
