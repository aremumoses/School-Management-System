'use server';

import { revalidatePath } from 'next/cache';
import { apiFetch } from '@/lib/api';
import type {
  CreatePeriodInput,
  CreateTimetableEntryInput,
  MyTimetableGridDto,
  PeriodDto,
  TimetableEntryDto,
  TimetableGridDto,
  UpdatePeriodInput,
  UpdateTimetableEntryInput,
} from '@/lib/types/timetable';

const BUILDER_PATH = '/admin/timetable';

export async function listPeriods(): Promise<PeriodDto[]> {
  return apiFetch<PeriodDto[]>('/timetable/periods');
}

export async function createPeriod(input: CreatePeriodInput): Promise<PeriodDto> {
  const period = await apiFetch<PeriodDto>('/timetable/periods', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  revalidatePath(BUILDER_PATH);
  return period;
}

export async function updatePeriod(id: string, input: UpdatePeriodInput): Promise<PeriodDto> {
  const period = await apiFetch<PeriodDto>(`/timetable/periods/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  revalidatePath(BUILDER_PATH);
  return period;
}

export async function deletePeriod(id: string): Promise<void> {
  await apiFetch(`/timetable/periods/${id}`, { method: 'DELETE' });
  revalidatePath(BUILDER_PATH);
}

export async function createTimetableEntry(
  input: CreateTimetableEntryInput,
): Promise<TimetableEntryDto> {
  const entry = await apiFetch<TimetableEntryDto>('/timetable/entries', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  revalidatePath(BUILDER_PATH);
  return entry;
}

export async function updateTimetableEntry(
  id: string,
  input: UpdateTimetableEntryInput,
): Promise<TimetableEntryDto> {
  const entry = await apiFetch<TimetableEntryDto>(`/timetable/entries/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  revalidatePath(BUILDER_PATH);
  return entry;
}

export async function deleteTimetableEntry(id: string): Promise<void> {
  await apiFetch(`/timetable/entries/${id}`, { method: 'DELETE' });
  revalidatePath(BUILDER_PATH);
}

export async function getArmTimetable(
  armId: string,
  termId?: string,
): Promise<TimetableGridDto> {
  const qs = termId ? `?termId=${termId}` : '';
  return apiFetch<TimetableGridDto>(`/timetable/arm/${armId}${qs}`);
}

export async function getStaffTimetable(
  staffId: string,
  termId?: string,
): Promise<TimetableGridDto> {
  const qs = termId ? `?termId=${termId}` : '';
  return apiFetch<TimetableGridDto>(`/timetable/staff/${staffId}${qs}`);
}

export async function getMyTimetable(termId?: string): Promise<MyTimetableGridDto> {
  const qs = termId ? `?termId=${termId}` : '';
  return apiFetch<MyTimetableGridDto>(`/timetable/me${qs}`);
}
