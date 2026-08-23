'use server';

import { revalidatePath } from 'next/cache';
import { apiFetch } from '@/lib/api';
import type {
  ClassSubjectDto,
  CreateSubjectInput,
  SubjectDto,
  UpdateSubjectInput,
} from '@/lib/types/academic';

const PATH = '/admin/academics/subjects';

export async function createSubject(input: CreateSubjectInput): Promise<SubjectDto> {
  const subject = await apiFetch<SubjectDto>('/subjects', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  revalidatePath(PATH);
  return subject;
}

export async function updateSubject(
  id: string,
  input: UpdateSubjectInput,
): Promise<SubjectDto> {
  const subject = await apiFetch<SubjectDto>(`/subjects/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  revalidatePath(PATH);
  return subject;
}

export async function deleteSubject(id: string): Promise<void> {
  await apiFetch<void>(`/subjects/${id}`, { method: 'DELETE' });
  revalidatePath(PATH);
}

export async function mapSubjectToClass(
  subjectId: string,
  classId: string,
): Promise<ClassSubjectDto> {
  const mapping = await apiFetch<ClassSubjectDto>(`/subjects/${subjectId}/classes`, {
    method: 'POST',
    body: JSON.stringify({ classId }),
  });
  revalidatePath(PATH);
  return mapping;
}

export async function unmapSubjectFromClass(classSubjectId: string): Promise<void> {
  await apiFetch<void>(`/class-subjects/${classSubjectId}`, { method: 'DELETE' });
  revalidatePath(PATH);
}
