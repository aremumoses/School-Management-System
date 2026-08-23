'use client';

import { FileText, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { DocumentPreview } from '@/components/documents/document-preview';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { generateDocument } from '@/lib/actions/documents';
import type { GeneratedDocumentType } from '@/lib/types/documents';
import type { Gender } from '@/lib/types/students';

interface StudentOption {
  id: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
  gender: Gender;
  className?: string | null;
  isActive?: boolean;
}

function studentLabel(s: StudentOption): string {
  const base = `${s.firstName} ${s.lastName} (${s.admissionNumber})`;
  return s.isActive === false ? `${base} — Inactive` : base;
}

const TYPE_OPTIONS: { value: GeneratedDocumentType; label: string }[] = [
  { value: 'TESTIMONIAL', label: 'Testimonial' },
  { value: 'CERTIFICATE', label: 'Certificate' },
];

export function GenerateDocumentForm({ students }: { students: StudentOption[] }) {
  const [open, setOpen] = useState(false);
  const [studentId, setStudentId] = useState('');
  const [type, setType] = useState<GeneratedDocumentType>('TESTIMONIAL');
  const [isSaving, setIsSaving] = useState(false);

  const selectedStudent = students.find((s) => s.id === studentId);

  async function submit() {
    if (!studentId) {
      toast.error('Pick a student first.');
      return;
    }
    setIsSaving(true);
    try {
      await generateDocument({ studentId, type });
      toast.success('Document requested — it now needs Admin approval.');
      setStudentId('');
      setType('TESTIMONIAL');
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't request this document.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm">
            <FileText className="size-4" aria-hidden="true" />
            Generate Document
          </Button>
        }
      />
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Request a Document</DialogTitle>
          <DialogDescription>
            Starts as a draft. The PDF is only rendered once an Admin approves it.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="document-student">Student</Label>
            <Select
              value={studentId}
              onValueChange={(v) => v && setStudentId(v)}
              items={students.map((s) => ({ value: s.id, label: studentLabel(s) }))}
            >
              <SelectTrigger id="document-student" className="w-full">
                <SelectValue placeholder="Select a student" />
              </SelectTrigger>
              <SelectContent>
                {students.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {studentLabel(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="document-type">Document Type</Label>
            <Select
              value={type}
              onValueChange={(v) => v && setType(v as GeneratedDocumentType)}
              items={TYPE_OPTIONS}
            >
              <SelectTrigger id="document-type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedStudent && (
            <DocumentPreview
              type={type}
              student={{ ...selectedStudent, className: selectedStudent.className }}
            />
          )}
        </div>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" type="button" />}>Cancel</DialogClose>
          <Button type="button" disabled={isSaving} onClick={submit}>
            {isSaving ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : 'Request Document'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
