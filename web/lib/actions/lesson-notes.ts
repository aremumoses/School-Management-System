'use server';

import { revalidatePath } from 'next/cache';
import { apiFetch } from '@/lib/api';
import type {
  CreateLessonNoteInput,
  DuplicateLessonNoteInput,
  LessonNoteDto,
  LessonNoteStatus,
  ReviewLessonNoteInput,
  UpdateLessonNoteInput,
} from '@/lib/types/lesson-notes';

const TEACHER_PATH = '/teacher/lesson-notes';
const ADMIN_PATH = '/admin/lesson-notes';

function revalidateBoth() {
  revalidatePath(TEACHER_PATH);
  revalidatePath(ADMIN_PATH);
}

export async function listLessonNotes(opts: {
  classSubjectId?: string;
  termId?: string;
  status?: LessonNoteStatus;
}): Promise<LessonNoteDto[]> {
  const q = new URLSearchParams();
  if (opts.classSubjectId) q.set('classSubjectId', opts.classSubjectId);
  if (opts.termId) q.set('termId', opts.termId);
  if (opts.status) q.set('status', opts.status);
  const qs = q.toString();
  return apiFetch<LessonNoteDto[]>(`/lesson-notes${qs ? `?${qs}` : ''}`);
}

export async function getLessonNote(id: string): Promise<LessonNoteDto> {
  return apiFetch<LessonNoteDto>(`/lesson-notes/${id}`);
}

export async function createLessonNote(
  input: CreateLessonNoteInput,
): Promise<LessonNoteDto> {
  const note = await apiFetch<LessonNoteDto>('/lesson-notes', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  revalidateBoth();
  return note;
}

export async function updateLessonNote(
  id: string,
  input: UpdateLessonNoteInput,
): Promise<LessonNoteDto> {
  const note = await apiFetch<LessonNoteDto>(`/lesson-notes/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  revalidateBoth();
  return note;
}

export async function reviewLessonNote(
  id: string,
  input: ReviewLessonNoteInput,
): Promise<LessonNoteDto> {
  const note = await apiFetch<LessonNoteDto>(`/lesson-notes/${id}/review`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  revalidateBoth();
  return note;
}

export async function duplicateLessonNote(
  id: string,
  input: DuplicateLessonNoteInput = {},
): Promise<LessonNoteDto> {
  const note = await apiFetch<LessonNoteDto>(`/lesson-notes/${id}/duplicate`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
  revalidateBoth();
  return note;
}

export async function uploadLessonNoteAttachment(
  id: string,
  formData: FormData,
): Promise<LessonNoteDto> {
  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    throw new Error('Choose a file first.');
  }
  const body = new FormData();
  body.set('file', file);
  const note = await apiFetch<LessonNoteDto>(`/lesson-notes/${id}/attachment`, {
    method: 'POST',
    body,
  });
  revalidateBoth();
  return note;
}
