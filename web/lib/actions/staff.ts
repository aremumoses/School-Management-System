'use server';

import { revalidatePath } from 'next/cache';
import { apiFetch } from '@/lib/api';
import type {
  AssignRoleInput,
  CreatedStaffDto,
  CreateStaffInput,
  CreateTeacherAssignmentInput,
  StaffDto,
  StaffRoleDto,
  TeacherAssignmentDto,
  UpdateStaffInput,
} from '@/lib/types/staff';

const LIST_PATH = '/admin/staff';

export async function createStaff(input: CreateStaffInput): Promise<CreatedStaffDto> {
  const staff = await apiFetch<CreatedStaffDto>('/staff', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  revalidatePath(LIST_PATH);
  return staff;
}

export async function updateStaff(id: string, input: UpdateStaffInput): Promise<StaffDto> {
  const staff = await apiFetch<StaffDto>(`/staff/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  revalidatePath(LIST_PATH);
  revalidatePath(`${LIST_PATH}/${id}`);
  return staff;
}

export async function assignRole(staffId: string, input: AssignRoleInput): Promise<StaffRoleDto> {
  const role = await apiFetch<StaffRoleDto>(`/staff/${staffId}/roles`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
  revalidatePath(LIST_PATH);
  revalidatePath(`${LIST_PATH}/${staffId}`);
  return role;
}

export async function removeRole(staffId: string, roleId: string): Promise<void> {
  await apiFetch<void>(`/staff/${staffId}/roles/${roleId}`, { method: 'DELETE' });
  revalidatePath(LIST_PATH);
  revalidatePath(`${LIST_PATH}/${staffId}`);
}

export async function addTeachingAssignment(
  staffId: string,
  input: CreateTeacherAssignmentInput,
): Promise<TeacherAssignmentDto> {
  const assignment = await apiFetch<TeacherAssignmentDto>(
    `/staff/${staffId}/teaching-assignments`,
    { method: 'POST', body: JSON.stringify(input) },
  );
  revalidatePath(`${LIST_PATH}/${staffId}`);
  return assignment;
}

export async function removeTeachingAssignment(
  staffId: string,
  assignmentId: string,
): Promise<void> {
  await apiFetch<void>(`/staff/teaching-assignments/${assignmentId}`, {
    method: 'DELETE',
  });
  revalidatePath(`${LIST_PATH}/${staffId}`);
}

export async function updateScoreEntryDeadline(
  staffId: string,
  assignmentId: string,
  scoreEntryDeadline: string | null,
): Promise<TeacherAssignmentDto> {
  const assignment = await apiFetch<TeacherAssignmentDto>(
    `/staff/teaching-assignments/${assignmentId}/deadline`,
    { method: 'PATCH', body: JSON.stringify({ scoreEntryDeadline }) },
  );
  revalidatePath(`${LIST_PATH}/${staffId}`);
  return assignment;
}
