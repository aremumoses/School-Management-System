'use server';

import { revalidatePath } from 'next/cache';
import { apiFetch } from '@/lib/api';
import type {
  ApproveActionInput,
  CreateIncidentInput,
  DisciplinaryActionDto,
  IncidentWithActionsDto,
  ProposeActionInput,
  RejectActionInput,
  UpdateIncidentInput,
} from '@/lib/types/discipline';

// Two route groups render the same Incident components (see
// app/admin/discipline and app/hostel-transport/discipline) — both need
// revalidating so whichever one the caller is on reflects the change
// without a manual refresh.
const DISCIPLINE_PATHS = ['/admin/discipline', '/hostel-transport/discipline'];

function revalidateDisciplinePaths(): void {
  for (const path of DISCIPLINE_PATHS) revalidatePath(path);
}

export async function listIncidents(studentId?: string): Promise<IncidentWithActionsDto[]> {
  const query = studentId ? `?studentId=${encodeURIComponent(studentId)}` : '';
  return apiFetch<IncidentWithActionsDto[]>(`/incidents${query}`);
}

export async function getIncident(id: string): Promise<IncidentWithActionsDto> {
  return apiFetch<IncidentWithActionsDto>(`/incidents/${id}`);
}

export async function createIncident(input: CreateIncidentInput): Promise<IncidentWithActionsDto> {
  const incident = await apiFetch<IncidentWithActionsDto>('/incidents', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  revalidateDisciplinePaths();
  return incident;
}

export async function updateIncident(
  id: string,
  input: UpdateIncidentInput,
): Promise<IncidentWithActionsDto> {
  const incident = await apiFetch<IncidentWithActionsDto>(`/incidents/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  revalidateDisciplinePaths();
  return incident;
}

export async function proposeAction(
  incidentId: string,
  input: ProposeActionInput,
): Promise<DisciplinaryActionDto> {
  const action = await apiFetch<DisciplinaryActionDto>(`/incidents/${incidentId}/actions`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
  revalidateDisciplinePaths();
  return action;
}

export async function approveAction(
  incidentId: string,
  actionId: string,
  input: ApproveActionInput,
): Promise<DisciplinaryActionDto> {
  const action = await apiFetch<DisciplinaryActionDto>(
    `/incidents/${incidentId}/actions/${actionId}/approve`,
    { method: 'POST', body: JSON.stringify(input) },
  );
  revalidateDisciplinePaths();
  return action;
}

export async function rejectAction(
  incidentId: string,
  actionId: string,
  input: RejectActionInput,
): Promise<DisciplinaryActionDto> {
  const action = await apiFetch<DisciplinaryActionDto>(
    `/incidents/${incidentId}/actions/${actionId}/reject`,
    { method: 'POST', body: JSON.stringify(input) },
  );
  revalidateDisciplinePaths();
  return action;
}
