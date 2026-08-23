'use server';

import { revalidatePath } from 'next/cache';
import { apiFetch } from '@/lib/api';
import type {
  AppraisalCycleDetailDto,
  AppraisalCycleDto,
  AppraisalFormDto,
  AppraisalSubmissionDto,
  CreateAppraisalCycleInput,
  CreateAppraisalSubmissionInput,
  SaveAppraisalResponsesInput,
  UpdateAppraisalCycleStatusInput,
  UpsertAppraisalFormInput,
} from '@/lib/types/appraisal';

function revalidateAll() {
  revalidatePath('/hr/appraisals');
}

export async function upsertAppraisalForm(
  input: UpsertAppraisalFormInput,
): Promise<AppraisalFormDto> {
  const form = await apiFetch<AppraisalFormDto>('/hr/appraisal-forms', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  revalidateAll();
  return form;
}

export async function listAppraisalForms(): Promise<AppraisalFormDto[]> {
  return apiFetch('/hr/appraisal-forms');
}

export async function createAppraisalCycle(
  input: CreateAppraisalCycleInput,
): Promise<AppraisalCycleDto> {
  const cycle = await apiFetch<AppraisalCycleDto>('/hr/appraisal-cycles', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  revalidateAll();
  return cycle;
}

export async function listAppraisalCycles(): Promise<AppraisalCycleDto[]> {
  return apiFetch('/hr/appraisal-cycles');
}

export async function getAppraisalCycle(id: string): Promise<AppraisalCycleDetailDto> {
  return apiFetch(`/hr/appraisal-cycles/${id}`);
}

export async function updateAppraisalCycleStatus(
  id: string,
  input: UpdateAppraisalCycleStatusInput,
): Promise<AppraisalCycleDto> {
  const cycle = await apiFetch<AppraisalCycleDto>(`/hr/appraisal-cycles/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  revalidateAll();
  return cycle;
}

export async function createAppraisalSubmission(
  cycleId: string,
  input: CreateAppraisalSubmissionInput,
): Promise<AppraisalSubmissionDto> {
  const submission = await apiFetch<AppraisalSubmissionDto>(
    `/hr/appraisal-cycles/${cycleId}/submissions`,
    { method: 'POST', body: JSON.stringify(input) },
  );
  revalidateAll();
  return submission;
}

export async function myAppraisalSubmissions(): Promise<AppraisalSubmissionDto[]> {
  return apiFetch('/hr/appraisal-submissions/mine');
}

export async function getAppraisalSubmission(id: string): Promise<AppraisalSubmissionDto> {
  return apiFetch(`/hr/appraisal-submissions/${id}`);
}

export async function saveAppraisalResponses(
  id: string,
  input: SaveAppraisalResponsesInput,
): Promise<AppraisalSubmissionDto> {
  const submission = await apiFetch<AppraisalSubmissionDto>(`/hr/appraisal-submissions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  revalidateAll();
  return submission;
}

export async function signOffAppraisal(id: string): Promise<AppraisalSubmissionDto> {
  const submission = await apiFetch<AppraisalSubmissionDto>(
    `/hr/appraisal-submissions/${id}/sign-off`,
    { method: 'PATCH' },
  );
  revalidateAll();
  return submission;
}

export async function getStaffAppraisalHistory(
  staffId: string,
): Promise<AppraisalSubmissionDto[]> {
  return apiFetch(`/hr/staff/${staffId}/appraisal-history`);
}
