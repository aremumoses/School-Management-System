'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { Download, FileText, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { ApproveDocumentDialog } from '@/components/documents/approve-document-dialog';
import { DocumentStatusBadge } from '@/components/documents/document-status-badge';
import { DataTable } from '@/components/dashboard/data-table';
import { Button } from '@/components/ui/button';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import type { GeneratedDocumentDto } from '@/lib/types/documents';
import type { Gender } from '@/lib/types/students';

interface StudentInfo {
  firstName: string;
  lastName: string;
  admissionNumber: string;
  gender: Gender;
  className?: string | null;
}

interface DocumentRow {
  document: GeneratedDocumentDto;
  student: StudentInfo;
}

const TYPE_LABELS = { TESTIMONIAL: 'Testimonial', CERTIFICATE: 'Certificate' };

export function DocumentsTable({ rows }: { rows: DocumentRow[] }) {
  const router = useRouter();
  const isRendering = rows.some((r) => r.document.status === 'APPROVED' && !r.document.url);

  // Mirrors pay-now-button.tsx's polling pattern: the PDF renders
  // asynchronously after approval (see DocumentProcessor), so the page
  // that just approved a document won't see its `url` until a background
  // job finishes — poll until it shows up instead of leaving "Rendering…"
  // stuck forever without a manual reload.
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (!isRendering) return;
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
  }, [isRendering, router]);

  const columns: ColumnDef<DocumentRow, unknown>[] = [
    {
      id: 'student',
      header: 'Student',
      accessorFn: (row) => `${row.student.firstName} ${row.student.lastName}`,
      cell: ({ row }) => (
        <span className="font-medium text-foreground">
          {row.original.student.firstName} {row.original.student.lastName}
        </span>
      ),
    },
    {
      id: 'type',
      header: 'Type',
      accessorFn: (row) => row.document.type,
      cell: ({ row }) => TYPE_LABELS[row.original.document.type],
    },
    {
      id: 'status',
      header: 'Status',
      accessorFn: (row) => row.document.status,
      cell: ({ row }) => <DocumentStatusBadge status={row.original.document.status} />,
    },
    {
      id: 'requested',
      header: 'Requested',
      accessorFn: (row) => row.document.createdAt,
      cell: ({ row }) => (
        <span className="text-sm tabular-nums text-muted-foreground">
          {new Date(row.original.document.createdAt).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const { document, student } = row.original;
        if (document.status === 'DRAFT') {
          return (
            <ApproveDocumentDialog
              documentId={document.id}
              type={document.type}
              student={student}
              trigger={
                <Button size="sm" variant="outline">
                  Preview &amp; Approve
                </Button>
              }
            />
          );
        }
        if (document.url) {
          return (
            <Button size="sm" variant="ghost" render={<a href={document.url} target="_blank" rel="noreferrer" />}>
              <Download className="size-3.5" aria-hidden="true" />
              Download
            </Button>
          );
        }
        return (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="size-3 animate-spin" aria-hidden="true" />
            Rendering…
          </span>
        );
      },
    },
  ];

  if (rows.length === 0) {
    return (
      <Empty className="border border-dashed border-border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FileText />
          </EmptyMedia>
          <EmptyTitle>No documents yet</EmptyTitle>
          <EmptyDescription>Generate a testimonial or certificate to get started.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return <DataTable columns={columns} data={rows} searchPlaceholder="Search by student…" />;
}
