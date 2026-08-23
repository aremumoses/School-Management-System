'use server';

import { revalidatePath } from 'next/cache';
import { apiFetch } from '@/lib/api';
import type {
  ClubDetailDto,
  ClubDto,
  ConsentFormDto,
  ConsentFormRowDto,
  ConsentResponsesDto,
  CreateClubInput,
  CreateConsentFormInput,
  GuardianConsentFormDto,
  MyClubDto,
  RespondConsentFormInput,
  UpdateClubInput,
} from '@/lib/types/clubs';

// --- Clubs ---

export async function listClubs(): Promise<ClubDto[]> {
  return apiFetch<ClubDto[]>('/clubs');
}

export async function getClub(id: string): Promise<ClubDetailDto> {
  return apiFetch<ClubDetailDto>(`/clubs/${id}`);
}

export async function createClub(input: CreateClubInput): Promise<ClubDto> {
  const club = await apiFetch<ClubDto>('/clubs', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  revalidatePath('/admin/clubs');
  return club;
}

export async function updateClub(id: string, input: UpdateClubInput): Promise<ClubDto> {
  const club = await apiFetch<ClubDto>(`/clubs/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  revalidatePath('/admin/clubs');
  return club;
}

export async function addClubMember(clubId: string, studentId: string): Promise<void> {
  await apiFetch(`/clubs/${clubId}/members`, {
    method: 'POST',
    body: JSON.stringify({ studentId }),
  });
  revalidatePath('/admin/clubs');
  revalidatePath('/student/clubs');
}

export async function removeClubMember(clubId: string, studentId: string): Promise<void> {
  await apiFetch(`/clubs/${clubId}/members/${studentId}`, { method: 'DELETE' });
  revalidatePath('/admin/clubs');
  revalidatePath('/student/clubs');
}

export async function listMyClubs(studentId: string): Promise<MyClubDto[]> {
  return apiFetch<MyClubDto[]>(`/students/${studentId}/clubs`);
}

// --- Consent forms ---

export async function listConsentForms(): Promise<ConsentFormRowDto[]> {
  return apiFetch<ConsentFormRowDto[]>('/consent-forms');
}

export async function listGuardianConsentForms(): Promise<GuardianConsentFormDto[]> {
  return apiFetch<GuardianConsentFormDto[]>('/consent-forms');
}

export async function createConsentForm(
  input: CreateConsentFormInput,
): Promise<ConsentFormDto> {
  const form = await apiFetch<ConsentFormDto>('/consent-forms', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  revalidatePath('/admin/consent-forms');
  revalidatePath('/parent/consent');
  return form;
}

export async function respondToConsentForm(
  formId: string,
  input: RespondConsentFormInput,
): Promise<void> {
  await apiFetch(`/consent-forms/${formId}/respond`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
  revalidatePath('/parent/consent');
  revalidatePath('/admin/consent-forms');
}

export async function getConsentResponses(formId: string): Promise<ConsentResponsesDto> {
  return apiFetch<ConsentResponsesDto>(`/consent-forms/${formId}/responses`);
}
