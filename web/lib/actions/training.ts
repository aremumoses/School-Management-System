'use server';

import { revalidatePath } from 'next/cache';
import { apiFetch } from '@/lib/api';
import type { TrainingRecordDto } from '@/lib/types/training';

export async function createTrainingRecord(formData: FormData): Promise<TrainingRecordDto> {
  const staffId = formData.get('staffId');
  const title = formData.get('title');
  const provider = formData.get('provider');
  const completedDate = formData.get('completedDate');
  if (typeof staffId !== 'string' || !staffId) {
    throw new Error('Choose a staff member.');
  }
  if (typeof title !== 'string' || !title.trim()) {
    throw new Error('Title is required.');
  }
  if (typeof provider !== 'string' || !provider.trim()) {
    throw new Error('Provider is required.');
  }
  if (typeof completedDate !== 'string' || !completedDate) {
    throw new Error('Completed date is required.');
  }

  const body = new FormData();
  body.set('staffId', staffId);
  body.set('title', title.trim());
  body.set('provider', provider.trim());
  body.set('completedDate', completedDate);
  const hoursOrCredits = formData.get('hoursOrCredits');
  if (typeof hoursOrCredits === 'string' && hoursOrCredits) {
    body.set('hoursOrCredits', hoursOrCredits);
  }
  const certificate = formData.get('certificate');
  if (certificate instanceof File && certificate.size > 0) {
    body.set('certificate', certificate);
  }

  const record = await apiFetch<TrainingRecordDto>('/hr/training-records', {
    method: 'POST',
    body,
  });
  revalidatePath('/hr/training');
  return record;
}

export async function getStaffTrainingHistory(staffId: string): Promise<TrainingRecordDto[]> {
  return apiFetch(`/hr/staff/${staffId}/training-history`);
}
