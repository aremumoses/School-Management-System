'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, ExternalLink, FileText, Plus, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { uploadStudentDocument } from '@/lib/actions/students';
import type { StudentDetailDto } from '@/lib/types/students';

const uploadSchema = z.object({
  type: z.string().min(1, 'Required').max(50),
});

function UploadDocumentDialog({ studentId }: { studentId: string }) {
  const [open, setOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof uploadSchema>>({
    resolver: zodResolver(uploadSchema),
    defaultValues: { type: '' },
  });

  function closeAndReset() {
    setOpen(false);
    setSelectedFile(null);
    reset();
  }

  async function onSubmit(values: z.infer<typeof uploadSchema>) {
    if (!selectedFile) {
      toast.error('Choose a file first.');
      return;
    }
    try {
      const formData = new FormData();
      formData.set('file', selectedFile);
      formData.set('type', values.type);
      await uploadStudentDocument(studentId, formData);
      toast.success('Document uploaded.');
      closeAndReset();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to upload document.');
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : closeAndReset())}>
      <DialogTrigger render={<Button />}>
        <Plus className="size-4" aria-hidden="true" />
        Upload Document
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload a Document</DialogTitle>
          <DialogDescription>
            e.g. a testimonial, birth certificate, or medical form. PDF or image, up to 10MB.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="document-type">Document Type</Label>
            <Input
              id="document-type"
              placeholder="Testimonial, Birth Certificate, Medical Form…"
              aria-invalid={Boolean(errors.type)}
              {...register('type')}
            />
            {errors.type && (
              <p className="flex items-center gap-1 text-sm text-destructive">
                <AlertCircle className="size-3.5" aria-hidden="true" />
                {errors.type.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label>File</Label>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border p-6 text-sm text-muted-foreground hover:border-primary hover:text-primary"
            >
              <Upload className="size-4" aria-hidden="true" />
              {selectedFile ? selectedFile.name : 'Click to choose a file'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Uploading…' : 'Upload'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DocumentsTab({ student }: { student: StudentDetailDto }) {
  const documents = student.documents ?? [];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <UploadDocumentDialog studentId={student.id} />
      </div>

      {documents.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No documents uploaded yet.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {documents.map((doc) => (
            <li key={doc.id} className="flex items-center justify-between gap-3 p-3">
              <div className="flex items-center gap-3">
                <FileText className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                <div>
                  <p className="text-sm font-medium text-foreground">{doc.type}</p>
                  <p className="text-xs text-muted-foreground">
                    Uploaded{' '}
                    {new Date(doc.uploadedAt).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" render={<a href={doc.url} target="_blank" rel="noreferrer" />}>
                <ExternalLink className="size-3.5" aria-hidden="true" />
                View
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
