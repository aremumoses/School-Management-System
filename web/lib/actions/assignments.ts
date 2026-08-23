'use server';

import { revalidatePath } from 'next/cache';
import { apiFetch } from '@/lib/api';
import type {
  AssignmentDetailDto,
  AssignmentDto,
  CreateAssignmentInput,
  GradebookDto,
  GradeSubmissionInput,
  StudentAssignmentDto,
  SubmissionDto,
  SubmitAssignmentInput,
  TeacherAssignmentRowDto,
  UpdateAssignmentInput,
  WardAssignmentDto,
} from '@/lib/types/assignments';

const TEACHER_PATH = '/teacher/assignments';
const STUDENT_PATH = '/student/assignments';
const PARENT_PATH = '/parent/homework';

function revalidateAll() {
  revalidatePath(TEACHER_PATH);
  revalidatePath(STUDENT_PATH);
  revalidatePath(PARENT_PATH);
}

export async function listTeacherAssignments(
  classSubjectId?: string,
): Promise<TeacherAssignmentRowDto[]> {
  const qs = classSubjectId ? `?classSubjectId=${classSubjectId}` : '';
  return apiFetch<TeacherAssignmentRowDto[]>(`/assignments${qs}`);
}

export async function listStudentAssignments(): Promise<StudentAssignmentDto[]> {
  return apiFetch<StudentAssignmentDto[]>('/assignments');
}

export async function listWardAssignments(
  studentId?: string,
): Promise<WardAssignmentDto[]> {
  const qs = studentId ? `?studentId=${studentId}` : '';
  return apiFetch<WardAssignmentDto[]>(`/assignments${qs}`);
}

export async function getAssignmentDetail(id: string): Promise<AssignmentDetailDto> {
  return apiFetch<AssignmentDetailDto>(`/assignments/${id}`);
}

export async function getStudentAssignment(id: string): Promise<StudentAssignmentDto> {
  return apiFetch<StudentAssignmentDto>(`/assignments/${id}`);
}

export async function createAssignment(
  input: CreateAssignmentInput,
): Promise<AssignmentDto> {
  const assignment = await apiFetch<AssignmentDto>('/assignments', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  revalidateAll();
  return assignment;
}

export async function updateAssignment(
  id: string,
  input: UpdateAssignmentInput,
): Promise<AssignmentDto> {
  const assignment = await apiFetch<AssignmentDto>(`/assignments/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  revalidateAll();
  return assignment;
}

export async function uploadAssignmentAttachment(
  id: string,
  formData: FormData,
): Promise<AssignmentDto> {
  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    throw new Error('Choose a file first.');
  }
  const body = new FormData();
  body.set('file', file);
  const assignment = await apiFetch<AssignmentDto>(`/assignments/${id}/attachment`, {
    method: 'POST',
    body,
  });
  revalidateAll();
  return assignment;
}

export async function submitAssignment(
  id: string,
  input: SubmitAssignmentInput,
): Promise<SubmissionDto> {
  const submission = await apiFetch<SubmissionDto>(`/assignments/${id}/submit`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
  revalidateAll();
  return submission;
}

export async function submitAssignmentFile(
  id: string,
  formData: FormData,
): Promise<SubmissionDto> {
  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    throw new Error('Choose a file first.');
  }
  const body = new FormData();
  body.set('file', file);
  const submission = await apiFetch<SubmissionDto>(`/assignments/${id}/submit-file`, {
    method: 'POST',
    body,
  });
  revalidateAll();
  return submission;
}

export async function gradeSubmission(
  assignmentId: string,
  submissionId: string,
  input: GradeSubmissionInput,
): Promise<SubmissionDto> {
  const submission = await apiFetch<SubmissionDto>(
    `/assignments/${assignmentId}/submissions/${submissionId}/grade`,
    { method: 'PATCH', body: JSON.stringify(input) },
  );
  revalidateAll();
  return submission;
}

export async function getGradebook(
  classSubjectId: string,
  sessionId: string,
  threshold?: number,
): Promise<GradebookDto> {
  const q = new URLSearchParams({ sessionId });
  if (threshold !== undefined) q.set('threshold', String(threshold));
  return apiFetch<GradebookDto>(`/classes/${classSubjectId}/gradebook?${q.toString()}`);
}
