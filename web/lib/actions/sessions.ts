'use server';

import { revalidatePath } from 'next/cache';
import { apiFetch } from '@/lib/api';
import type {
  AcademicSessionDto,
  CreateSessionInput,
  CreateTermInput,
  TermDto,
  UpdateTermInput,
} from '@/lib/types/academic';

const PATH = '/admin/academics/sessions';

export async function createSession(
  input: CreateSessionInput,
): Promise<AcademicSessionDto> {
  const session = await apiFetch<AcademicSessionDto>('/academic-sessions', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  revalidatePath(PATH);
  return session;
}

export async function addTerm(sessionId: string, input: CreateTermInput): Promise<TermDto> {
  const term = await apiFetch<TermDto>(`/academic-sessions/${sessionId}/terms`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
  revalidatePath(PATH);
  return term;
}

export async function updateTerm(termId: string, input: UpdateTermInput): Promise<TermDto> {
  const term = await apiFetch<TermDto>(`/terms/${termId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  revalidatePath(PATH);
  return term;
}

export async function deleteTerm(termId: string): Promise<void> {
  await apiFetch<void>(`/terms/${termId}`, { method: 'DELETE' });
  revalidatePath(PATH);
}

export async function setCurrentTerm(termId: string): Promise<TermDto> {
  const term = await apiFetch<TermDto>(`/terms/${termId}/set-current`, {
    method: 'POST',
  });
  revalidatePath(PATH);
  return term;
}
