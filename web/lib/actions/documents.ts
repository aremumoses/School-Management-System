'use server';

import { revalidatePath } from 'next/cache';
import { apiFetch } from '@/lib/api';
import type { GenerateDocumentInput, GeneratedDocumentDto } from '@/lib/types/documents';

const DOCUMENTS_PATH = '/admin/documents';

export async function listDocuments(studentId?: string): Promise<GeneratedDocumentDto[]> {
  const query = studentId ? `?studentId=${encodeURIComponent(studentId)}` : '';
  return apiFetch<GeneratedDocumentDto[]>(`/documents${query}`);
}

export async function getDocument(id: string): Promise<GeneratedDocumentDto> {
  return apiFetch<GeneratedDocumentDto>(`/documents/${id}`);
}

export async function generateDocument(
  input: GenerateDocumentInput,
): Promise<GeneratedDocumentDto> {
  const document = await apiFetch<GeneratedDocumentDto>('/documents/generate', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  revalidatePath(DOCUMENTS_PATH);
  return document;
}

export async function approveDocument(id: string): Promise<GeneratedDocumentDto> {
  const document = await apiFetch<GeneratedDocumentDto>(`/documents/${id}/approve`, {
    method: 'POST',
  });
  revalidatePath(DOCUMENTS_PATH);
  return document;
}
