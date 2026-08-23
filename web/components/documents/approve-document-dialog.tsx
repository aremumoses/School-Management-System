'use client';

import { Loader2 } from 'lucide-react';
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
import { approveDocument } from '@/lib/actions/documents';
import type { GeneratedDocumentType } from '@/lib/types/documents';
import type { Gender } from '@/lib/types/students';

export function ApproveDocumentDialog({
  documentId,
  type,
  student,
  trigger,
}: {
  documentId: string;
  type: GeneratedDocumentType;
  student: {
    firstName: string;
    lastName: string;
    admissionNumber: string;
    gender: Gender;
    className?: string | null;
  };
  trigger: React.ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  async function submit() {
    setIsSaving(true);
    try {
      await approveDocument(documentId);
      toast.success('Document approved — it will be downloadable shortly once the PDF renders.');
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not approve this document.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Review &amp; Approve</DialogTitle>
          <DialogDescription>
            {student.firstName} {student.lastName} — {type === 'TESTIMONIAL' ? 'Testimonial' : 'Certificate'}
          </DialogDescription>
        </DialogHeader>

        <DocumentPreview type={type} student={student} />

        <DialogFooter>
          <DialogClose render={<Button variant="outline" type="button" />}>Cancel</DialogClose>
          <Button type="button" disabled={isSaving} onClick={submit}>
            {isSaving ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : 'Approve'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
