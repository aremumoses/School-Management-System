'use server';

import { revalidatePath } from 'next/cache';
import { apiFetch } from '@/lib/api';
import type {
  AtRiskStudentDto,
  CreatedStudentDto,
  CreateEnrollmentInput,
  CreateStudentInput,
  EnrollmentDto,
  LinkGuardianInput,
  StudentDetailDto,
  StudentDto,
  StudentGuardianLinkDto,
  UpdateEnrollmentInput,
  UpdateStudentInput,
} from '@/lib/types/students';

const LIST_PATH = '/admin/students';

function detailPath(id: string): string {
  return `${LIST_PATH}/${id}`;
}

/**
 * Exposed as a server action (not just a page-level fetch) so client
 * components can pull a student's guardians on demand — e.g. the
 * "start a conversation" picker, which needs to resolve which guardian(s)
 * a chosen student has before a teacher can pick who to message.
 */
export async function getStudentDetail(id: string): Promise<StudentDetailDto> {
  return apiFetch<StudentDetailDto>(`/students/${id}`);
}

/** Stage 29 — currently flagged at-risk students. `classId` is an arm id (required for CLASS_TEACHER callers, omittable for Admin/VP — see AtRiskFlaggingService.getAtRiskStudents). */
export async function getAtRiskStudents(classId?: string): Promise<AtRiskStudentDto[]> {
  const qs = classId ? `?classId=${classId}` : '';
  return apiFetch<AtRiskStudentDto[]>(`/students/at-risk${qs}`);
}

export async function createStudent(input: CreateStudentInput): Promise<CreatedStudentDto> {
  const student = await apiFetch<CreatedStudentDto>('/students', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  revalidatePath(LIST_PATH);
  return student;
}

export async function updateStudent(id: string, input: UpdateStudentInput): Promise<StudentDto> {
  const student = await apiFetch<StudentDto>(`/students/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  revalidatePath(LIST_PATH);
  revalidatePath(detailPath(id));
  return student;
}

export async function softDeleteStudent(id: string): Promise<void> {
  await apiFetch<void>(`/students/${id}`, { method: 'DELETE' });
  revalidatePath(LIST_PATH);
}

export async function uploadStudentPhoto(id: string, formData: FormData): Promise<StudentDto> {
  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    throw new Error('Choose a photo first.');
  }
  const body = new FormData();
  body.set('file', file);
  const student = await apiFetch<StudentDto>(`/students/${id}/photo`, { method: 'POST', body });
  revalidatePath(detailPath(id));
  return student;
}

export async function uploadStudentDocument(
  id: string,
  formData: FormData,
): Promise<StudentDto> {
  const file = formData.get('file');
  const type = formData.get('type');
  if (!(file instanceof File) || file.size === 0) {
    throw new Error('Choose a file first.');
  }
  if (typeof type !== 'string' || type.trim().length === 0) {
    throw new Error('Document type is required.');
  }
  const body = new FormData();
  body.set('file', file);
  body.set('type', type);
  const student = await apiFetch<StudentDto>(`/students/${id}/documents`, {
    method: 'POST',
    body,
  });
  revalidatePath(detailPath(id));
  return student;
}

export async function linkGuardian(
  studentId: string,
  input: LinkGuardianInput,
): Promise<StudentGuardianLinkDto> {
  const link = await apiFetch<StudentGuardianLinkDto>(`/students/${studentId}/guardians`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
  revalidatePath(detailPath(studentId));
  return link;
}

export async function unlinkGuardian(studentId: string, guardianId: string): Promise<void> {
  await apiFetch<void>(`/students/${studentId}/guardians/${guardianId}`, { method: 'DELETE' });
  revalidatePath(detailPath(studentId));
}

export async function createEnrollment(
  studentId: string,
  input: CreateEnrollmentInput,
): Promise<EnrollmentDto> {
  const enrollment = await apiFetch<EnrollmentDto>(`/students/${studentId}/enrollments`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
  revalidatePath(detailPath(studentId));
  revalidatePath(LIST_PATH);
  return enrollment;
}

export async function updateEnrollmentStatus(
  studentId: string,
  enrollmentId: string,
  input: UpdateEnrollmentInput,
): Promise<EnrollmentDto> {
  const enrollment = await apiFetch<EnrollmentDto>(
    `/students/${studentId}/enrollments/${enrollmentId}`,
    { method: 'PATCH', body: JSON.stringify(input) },
  );
  revalidatePath(detailPath(studentId));
  revalidatePath(LIST_PATH);
  return enrollment;
}
