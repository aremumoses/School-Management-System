'use server';

import { revalidatePath } from 'next/cache';
import { apiFetch } from '@/lib/api';
import type {
  BulkImportCommitResponse,
  BulkImportPreviewResponse,
  ValidStudentImportRow,
} from '@/lib/types/students';

export async function previewBulkImport(
  formData: FormData,
  termId: string,
): Promise<BulkImportPreviewResponse> {
  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    throw new Error('Choose a spreadsheet first.');
  }
  if (!termId) {
    throw new Error('Choose which term to enroll these students into first.');
  }
  const body = new FormData();
  body.set('file', file);
  return apiFetch<BulkImportPreviewResponse>(
    `/students/bulk-import/preview?termId=${encodeURIComponent(termId)}`,
    { method: 'POST', body },
  );
}

export async function commitBulkImport(
  termId: string,
  rows: ValidStudentImportRow[],
): Promise<BulkImportCommitResponse> {
  const result = await apiFetch<BulkImportCommitResponse>('/students/bulk-import/commit', {
    method: 'POST',
    body: JSON.stringify({ termId, rows }),
  });
  revalidatePath('/admin/students');
  return result;
}
