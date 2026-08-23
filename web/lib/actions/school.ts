'use server';

import { revalidatePath } from 'next/cache';
import { apiFetch } from '@/lib/api';
import type {
  SchoolDto,
  UpdateGradingScaleInput,
  UpdateSchoolInput,
} from '@/lib/types/academic';

export async function updateSchoolProfile(input: UpdateSchoolInput): Promise<SchoolDto> {
  const school = await apiFetch<SchoolDto>('/school', {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  revalidatePath('/admin/settings/school');
  return school;
}

export async function uploadSchoolLogo(formData: FormData): Promise<SchoolDto> {
  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    throw new Error('Choose a logo file first.');
  }
  const body = new FormData();
  body.set('file', file);
  const school = await apiFetch<SchoolDto>('/school/logo', {
    method: 'POST',
    body,
  });
  revalidatePath('/admin/settings/school');
  return school;
}

export async function updateGradingScale(input: UpdateGradingScaleInput): Promise<SchoolDto> {
  const school = await apiFetch<SchoolDto>('/school/grading-scale', {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  revalidatePath('/admin/settings/school');
  return school;
}
