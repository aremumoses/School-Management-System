'use client';

import { Download, FileText, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { DocumentStatusBadge } from '@/components/documents/document-status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import type { GeneratedDocumentDto } from '@/lib/types/documents';

const TYPE_LABELS = { TESTIMONIAL: 'Testimonial', CERTIFICATE: 'Certificate' };

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * Every document this list is ever given is already APPROVED — the
 * backend never returns a DRAFT document to a Student/Parent caller (see
 * DocumentsService.buildScopedWhere/assertAccess), so there's nothing to
 * filter here. The "Done when" rule ("a parent never sees a document
 * that hasn't been Admin-approved") is enforced server-side, not by this
 * component hiding rows.
 */
export function DocumentDownloadList({
  documents,
  studentLabel,
}: {
  documents: GeneratedDocumentDto[];
  studentLabel?: (studentId: string) => string;
}) {
  const router = useRouter();
  const isPreparing = documents.some((d) => !d.url);

  // Same polling pattern as pay-now-button.tsx / documents-table.tsx — an
  // APPROVED document's PDF still renders asynchronously in the
  // background, so without this "Preparing…" would never update until a
  // manual reload.
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (!isPreparing) return;
    let attempts = 0;
    pollRef.current = setInterval(() => {
      attempts += 1;
      router.refresh();
      if (attempts >= 20 && pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    }, 3000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
    };
  }, [isPreparing, router]);

  if (documents.length === 0) {
    return (
      <Empty className="border border-dashed border-border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FileText />
          </EmptyMedia>
          <EmptyTitle>No documents yet</EmptyTitle>
          <EmptyDescription>
            Approved testimonials and certificates will appear here, ready to download.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="space-y-2">
      {documents.map((document) => (
        <Card key={document.id}>
          <CardContent className="flex items-center justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2">
                <p className="font-medium text-foreground">{TYPE_LABELS[document.type]}</p>
                <DocumentStatusBadge status={document.status} />
              </div>
              <p className="text-xs text-muted-foreground">
                {studentLabel ? `${studentLabel(document.studentId)} · ` : ''}
                {document.approvedAt ? `Approved ${formatDate(document.approvedAt)}` : ''}
              </p>
            </div>
            {document.url ? (
              <Button
                size="sm"
                variant="outline"
                render={<a href={document.url} target="_blank" rel="noreferrer" />}
              >
                <Download className="size-3.5" aria-hidden="true" />
                Download
              </Button>
            ) : (
              <span className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
                <Loader2 className="size-3 animate-spin" aria-hidden="true" />
                Preparing…
              </span>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
