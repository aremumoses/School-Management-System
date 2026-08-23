'use server';

import { apiFetch } from '@/lib/api';
import type { CreatedGuardianDto, CreateGuardianInput } from '@/lib/types/students';

export async function createGuardian(input: CreateGuardianInput): Promise<CreatedGuardianDto> {
  return apiFetch<CreatedGuardianDto>('/guardians', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function resetGuardianPassword(id: string): Promise<{ temporaryPassword: string }> {
  return apiFetch<{ temporaryPassword: string }>(`/guardians/${id}/reset-password`, {
    method: 'POST',
  });
}
