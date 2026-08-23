'use server';

import { revalidatePath } from 'next/cache';
import { apiFetch } from '@/lib/api';
import type {
  ArmDto,
  ClassDto,
  CreateArmInput,
  CreateClassInput,
  UpdateArmInput,
  UpdateClassInput,
} from '@/lib/types/academic';

const PATH = '/admin/academics/classes';

export async function createClass(input: CreateClassInput): Promise<ClassDto> {
  const klass = await apiFetch<ClassDto>('/classes', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  revalidatePath(PATH);
  return klass;
}

export async function updateClass(id: string, input: UpdateClassInput): Promise<ClassDto> {
  const klass = await apiFetch<ClassDto>(`/classes/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  revalidatePath(PATH);
  return klass;
}

export async function deleteClass(id: string): Promise<void> {
  await apiFetch<void>(`/classes/${id}`, { method: 'DELETE' });
  revalidatePath(PATH);
}

export async function addArm(classId: string, input: CreateArmInput): Promise<ArmDto> {
  const arm = await apiFetch<ArmDto>(`/classes/${classId}/arms`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
  revalidatePath(PATH);
  return arm;
}

export async function updateArm(armId: string, input: UpdateArmInput): Promise<ArmDto> {
  const arm = await apiFetch<ArmDto>(`/arms/${armId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  revalidatePath(PATH);
  return arm;
}

export async function deleteArm(armId: string): Promise<void> {
  await apiFetch<void>(`/arms/${armId}`, { method: 'DELETE' });
  revalidatePath(PATH);
}
