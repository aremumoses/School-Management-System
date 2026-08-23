'use server';

import { revalidatePath } from 'next/cache';
import { apiFetch } from '@/lib/api';
import type {
  CreateResourceInput,
  ResourceDto,
  ResourceType,
} from '@/lib/types/resources';

function revalidateBoth() {
  revalidatePath('/teacher/resources');
  revalidatePath('/student/library');
}

export async function listResources(opts: {
  classId?: string;
  subjectId?: string;
  type?: ResourceType;
  search?: string;
}): Promise<ResourceDto[]> {
  const q = new URLSearchParams();
  if (opts.classId) q.set('classId', opts.classId);
  if (opts.subjectId) q.set('subjectId', opts.subjectId);
  if (opts.type) q.set('type', opts.type);
  if (opts.search) q.set('search', opts.search);
  const qs = q.toString();
  return apiFetch<ResourceDto[]>(`/resources${qs ? `?${qs}` : ''}`);
}

export async function createResource(input: CreateResourceInput): Promise<ResourceDto> {
  const resource = await apiFetch<ResourceDto>('/resources', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  revalidateBoth();
  return resource;
}

export async function uploadResourceFile(
  id: string,
  formData: FormData,
): Promise<ResourceDto> {
  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    throw new Error('Choose a file first.');
  }
  const body = new FormData();
  body.set('file', file);
  const resource = await apiFetch<ResourceDto>(`/resources/${id}/file`, {
    method: 'POST',
    body,
  });
  revalidateBoth();
  return resource;
}

export async function deleteResource(id: string): Promise<void> {
  await apiFetch(`/resources/${id}`, { method: 'DELETE' });
  revalidateBoth();
}
