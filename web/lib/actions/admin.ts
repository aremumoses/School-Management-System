'use server';

import { revalidatePath } from 'next/cache';
import { apiFetch } from '@/lib/api';
import type {
  AttendanceTrendPoint,
  AuditLogListResponse,
  PerformanceTrendPoint,
  SubjectPerformanceRow,
  TeacherPerformanceRow,
} from '@/lib/types/admin';

export async function updateEnabledModules(modules: string[]): Promise<void> {
  await apiFetch('/school/modules', {
    method: 'PATCH',
    body: JSON.stringify({ enabledModules: modules }),
  });
  revalidatePath('/admin/settings/modules');
}

export async function getPermissionMatrix(): Promise<Record<string, string>> {
  return apiFetch<Record<string, string>>('/school/permission-matrix');
}

export async function getPerformanceTrends(sessionId: string): Promise<PerformanceTrendPoint[]> {
  return apiFetch<PerformanceTrendPoint[]>(
    `/analytics/performance-trends?sessionId=${sessionId}`,
  );
}

export async function getSubjectPerformance(termId: string): Promise<SubjectPerformanceRow[]> {
  return apiFetch<SubjectPerformanceRow[]>(
    `/analytics/subject-performance?termId=${termId}`,
  );
}

export async function getTeacherPerformance(termId: string): Promise<TeacherPerformanceRow[]> {
  return apiFetch<TeacherPerformanceRow[]>(
    `/analytics/teacher-performance?termId=${termId}`,
  );
}

export async function getAttendanceTrends(sessionId: string): Promise<AttendanceTrendPoint[]> {
  return apiFetch<AttendanceTrendPoint[]>(
    `/analytics/attendance-trends?sessionId=${sessionId}`,
  );
}

export async function listAuditLog(opts: {
  entityType?: string;
  actorId?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}): Promise<AuditLogListResponse> {
  const q = new URLSearchParams();
  if (opts.entityType) q.set('entityType', opts.entityType);
  if (opts.actorId) q.set('actorId', opts.actorId);
  if (opts.from) q.set('from', opts.from);
  if (opts.to) q.set('to', opts.to);
  if (opts.page) q.set('page', String(opts.page));
  if (opts.pageSize) q.set('pageSize', String(opts.pageSize));
  return apiFetch<AuditLogListResponse>(`/audit-log?${q.toString()}`);
}

export async function createAssessmentComponent(input: {
  name: string;
  maxScore: number;
  weight: number;
  termId: string;
  subjectId?: string;
}): Promise<void> {
  await apiFetch('/assessment-components', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  revalidatePath('/admin/assessment-structure');
  revalidatePath('/exam-officer/assessment-structure');
}

export async function updateAssessmentComponent(
  id: string,
  input: { name?: string; maxScore?: number; weight?: number },
): Promise<void> {
  await apiFetch(`/assessment-components/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  revalidatePath('/admin/assessment-structure');
  revalidatePath('/exam-officer/assessment-structure');
}

export async function deleteAssessmentComponent(id: string): Promise<void> {
  await apiFetch(`/assessment-components/${id}`, { method: 'DELETE' });
  revalidatePath('/admin/assessment-structure');
  revalidatePath('/exam-officer/assessment-structure');
}
