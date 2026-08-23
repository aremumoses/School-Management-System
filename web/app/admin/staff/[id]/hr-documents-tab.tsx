'use client';

import { AlertTriangle, ExternalLink, FileText, Trash2, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { deleteStaffDocument, uploadStaffDocument } from '@/lib/actions/hr';
import type { StaffDocumentDto, StaffDocumentType } from '@/lib/types/hr';

const TYPE_LABELS: Record<StaffDocumentType, string> = {
  CV: 'CV',
  CERTIFICATE: 'Certificate',
  ID: 'ID',
  CONTRACT: 'Contract',
  OTHER: 'Other',
};

function isExpiringSoon(expiryDate: string | null): boolean {
  if (!expiryDate) return false;
  const daysUntil = Math.ceil(
    (new Date(expiryDate).getTime() - Date.now()) / 86_400_000,
  );
  return daysUntil <= 30;
}

function UploadDialog({ staffId }: { staffId: string }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<StaffDocumentType>('CV');
  const [expiryDate, setExpiryDate] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function closeAndReset() {
    setOpen(false);
    setSelectedFile(null);
    setExpiryDate('');
    setType('CV');
  }

  async function handleUpload() {
    if (!selectedFile) {
      toast.error('Choose a file first.');
      return;
    }
    setIsSaving(true);
    try {
      const formData = new FormData();
      formData.set('file', selectedFile);
      formData.set('type', type);
      if (expiryDate) formData.set('expiryDate', expiryDate);
      await uploadStaffDocument(staffId, formData);
      toast.success('Document uploaded.');
      closeAndReset();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to upload document.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : closeAndReset())}>
      <DialogTrigger render={<Button />}>
        <Upload className="size-4" aria-hidden="true" />
        Upload Document
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload a Document</DialogTitle>
          <DialogDescription>CV, certificate, ID, or signed contract. PDF or image, up to 10MB.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Document Type</Label>
            <Select
              value={type}
              onValueChange={(v) => v && setType(v as StaffDocumentType)}
              items={Object.entries(TYPE_LABELS).map(([value, label]) => ({ value, label }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="doc-expiry">Expiry Date (contracts only, optional)</Label>
            <Input
              id="doc-expiry"
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
            />
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
        </div>
        <DialogFooter>
          <Button onClick={() => void handleUpload()} disabled={isSaving}>
            {isSaving ? 'Uploading…' : 'Upload'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function HrDocumentsTab({
  staffId,
  documents,
}: {
  staffId: string;
  documents: StaffDocumentDto[];
}) {
  async function handleDelete(documentId: string) {
    try {
      await deleteStaffDocument(staffId, documentId);
      toast.success('Document removed.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove document.');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <UploadDialog staffId={staffId} />
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
                  <p className="text-sm font-medium text-foreground">
                    {TYPE_LABELS[doc.type]}
                    {doc.expiryDate && isExpiringSoon(doc.expiryDate) && (
                      <span className="ml-2 inline-flex items-center gap-1 text-xs text-warning-soft-foreground">
                        <AlertTriangle className="size-3" aria-hidden="true" />
                        Expires {new Date(doc.expiryDate).toLocaleDateString('en-GB')}
                      </span>
                    )}
                  </p>
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
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  render={<a href={doc.fileUrl} target="_blank" rel="noreferrer" />}
                >
                  <ExternalLink className="size-3.5" aria-hidden="true" />
                  View
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void handleDelete(doc.id)}
                  aria-label="Delete document"
                >
                  <Trash2 className="size-3.5" aria-hidden="true" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
