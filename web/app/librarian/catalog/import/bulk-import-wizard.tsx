'use client';

import { Check, Download, FileSpreadsheet, Upload } from 'lucide-react';
import Link from 'next/link';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Stepper } from '@/components/dashboard/stepper';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { commitBookImport, previewBookImport } from '@/lib/actions/library';
import type { BulkImportCommitResult, BulkImportPreviewResult } from '@/lib/types/library';
import { cn } from '@/lib/utils';
import { ImportPreviewTable } from './import-preview-table';

const STEPS = ['Upload', 'Review', 'Confirm'];

export function BulkImportWizard() {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [preview, setPreview] = useState<BulkImportPreviewResult | null>(null);
  const [commitResult, setCommitResult] = useState<BulkImportCommitResult | null>(null);
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
      const result = await previewBookImport(formData);
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
      const result = await commitBookImport(preview.valid);
      setCommitResult(result);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to import the catalog.');
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
              {commitResult.succeededCount} book{commitResult.succeededCount === 1 ? '' : 's'}{' '}
              imported successfully.
              {commitResult.failedCount > 0 &&
                ` ${commitResult.failedCount} row${commitResult.failedCount === 1 ? '' : 's'} failed.`}
            </p>
          </div>
          {commitResult.failedCount > 0 && (
            <ul className="space-y-1 rounded-lg bg-error-soft p-3 text-left text-sm text-error-soft-foreground">
              {commitResult.results
                .filter((r) => !r.success)
                .map((r) => (
                  <li key={r.rowNumber}>
                    Row {r.rowNumber}: {r.error}
                  </li>
                ))}
            </ul>
          )}
          <Button render={<Link href="/librarian" />}>Back to Catalog</Button>
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
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
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
              href="/api/library/books/bulk-import/template"
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              <Download className="size-3.5" aria-hidden="true" />
              Download the spreadsheet template
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
          <ImportPreviewTable preview={preview} />
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
              {preview.valid.length} of {preview.valid.length + preview.invalid.length} rows valid
            </p>
            {preview.invalid.length > 0 && (
              <p className="text-sm text-muted-foreground">
                {preview.invalid.length} row{preview.invalid.length === 1 ? '' : 's'} with errors
                will be skipped — go back and fix your spreadsheet if you&apos;d rather not skip
                them.
              </p>
            )}
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
