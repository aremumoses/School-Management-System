'use client';

import { Check, Download, FileSpreadsheet, Upload } from 'lucide-react';
import Link from 'next/link';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Stepper } from '@/components/dashboard/stepper';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StaffImportRow {
  rowNumber: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  employmentDate: string;
  roles: string[];
}

interface StaffImportError {
  rowNumber: number;
  field: string;
  message: string;
}

interface StaffBulkPreviewResult {
  valid: StaffImportRow[];
  errors: StaffImportError[];
  totalRows: number;
}

interface StaffBulkCommitResult {
  created: number;
  skipped: number;
  staffIds: string[];
}

const STEPS = ['Upload', 'Review', 'Confirm'];

export function StaffImportWizard() {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [preview, setPreview] = useState<StaffBulkPreviewResult | null>(null);
  const [commitResult, setCommitResult] = useState<StaffBulkCommitResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(selected: File | undefined) {
    if (!selected) return;
    const isExcel =
      selected.name.endsWith('.xlsx') ||
      selected.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    if (!isExcel) {
      toast.error('Please choose a .xlsx spreadsheet.');
      return;
    }
    setFile(selected);
  }

  async function handleUploadContinue() {
    if (!file) {
      toast.error('Choose a spreadsheet first.');
      return;
    }
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.set('file', file);
      const res = await fetch('/api/staff/bulk-import/preview', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json() as { message?: string };
        throw new Error(err.message ?? 'Failed to preview.');
      }
      const result = await res.json() as StaffBulkPreviewResult;
      setPreview(result);
      setStep(2);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to read this spreadsheet.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleConfirm() {
    if (!preview) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/staff/bulk-import/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ valid: preview.valid }),
      });
      if (!res.ok) {
        const err = await res.json() as { message?: string };
        throw new Error(err.message ?? 'Import failed.');
      }
      const result = await res.json() as StaffBulkCommitResult;
      setCommitResult(result);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to import staff.');
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
              {commitResult.created} staff member{commitResult.created === 1 ? '' : 's'} created.
              {commitResult.skipped > 0 &&
                ` ${commitResult.skipped} row${commitResult.skipped === 1 ? '' : 's'} skipped (already exist or had errors).`}
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Temporary passwords were generated for each new account. Staff members should log in
            and change their passwords immediately.
          </p>
          <Button render={<Link href="/admin/staff" />}>Back to Staff Directory</Button>
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
            <div
              role="button"
              tabIndex={0}
              onClick={() => inputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
              }}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                handleFile(e.dataTransfer.files[0]);
              }}
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
                  <p className="font-medium">Drag and drop your spreadsheet here</p>
                  <p className="text-xs">or click to browse — .xlsx only</p>
                </>
              )}
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx"
                className="sr-only"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
            </div>

            <a
              href="/api/staff/bulk-import/template"
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              <Download className="size-3.5" aria-hidden="true" />
              Download the staff import template
            </a>

            <div className="flex justify-end border-t border-border pt-4">
              <Button onClick={() => void handleUploadContinue()} disabled={isLoading}>
                {isLoading ? 'Reading file…' : 'Continue'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && preview && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Badge variant="success">{preview.valid.length} valid rows</Badge>
            {preview.errors.length > 0 && (
              <Badge variant="error">{preview.errors.length} errors</Badge>
            )}
            <span className="text-sm text-muted-foreground">
              of {preview.totalRows} total rows
            </span>
          </div>

          {preview.errors.length > 0 && (
            <div className="overflow-hidden rounded-lg border border-error-soft">
              <div className="bg-error-soft px-3 py-2 text-xs font-medium text-error-soft-foreground">
                Rows with errors (will be skipped)
              </div>
              <ul className="divide-y divide-border px-3">
                {preview.errors.map((e, i) => (
                  <li key={i} className="py-1.5 text-xs text-muted-foreground">
                    Row {e.rowNumber} · {e.field}: {e.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {preview.valid.length > 0 && (
            <div className="overflow-hidden rounded-lg border border-border">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-medium">Name</th>
                      <th className="px-3 py-2 font-medium">Email</th>
                      <th className="px-3 py-2 font-medium">Roles</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {preview.valid.map((row) => (
                      <tr key={row.rowNumber}>
                        <td className="px-3 py-2 font-medium">
                          {row.firstName} {row.lastName}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">{row.email}</td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap gap-1">
                            {row.roles.map((r) => (
                              <Badge key={r} variant="outline" className="text-xs">
                                {r}
                              </Badge>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button onClick={() => setStep(3)} disabled={preview.valid.length === 0}>
              Continue
            </Button>
          </div>
        </div>
      )}

      {step === 3 && preview && (
        <Card>
          <CardContent className="space-y-6 text-center">
            <p className="text-lg font-medium text-foreground">
              {preview.valid.length} of {preview.totalRows} rows valid
            </p>
            {preview.errors.length > 0 && (
              <p className="text-sm text-muted-foreground">
                {preview.errors.length} row{preview.errors.length === 1 ? '' : 's'} with errors
                will be skipped.
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              Each new staff member will receive a temporary password. They must change it on first
              login.
            </p>
            <div className="flex justify-center gap-2 border-t border-border pt-4">
              <Button variant="outline" onClick={() => setStep(2)}>
                Back to Review
              </Button>
              <Button onClick={() => void handleConfirm()} disabled={isLoading}>
                {isLoading ? 'Importing…' : 'Confirm Import'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
