'use server';

import { revalidatePath } from 'next/cache';
import { apiFetch } from '@/lib/api';
import type {
  ApplicantDto,
  ApplicantStatusDto,
  ApplyInput,
  ConvertInput,
  ReviewInput,
} from '@/lib/types/admissions';

const ADMISSIONS_PATH = '/admin/admissions';

/** Public — no auth token attached. */
export async function applyForAdmission(input: ApplyInput): Promise<ApplicantDto> {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/admissions/apply`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(15_000),
    },
  );
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(body.message ?? `Application failed (${res.status})`);
  }
  return res.json() as Promise<ApplicantDto>;
}

/** Public status check — no auth token. */
export async function getApplicantStatus(id: string): Promise<ApplicantStatusDto> {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/admissions/status/${id}`,
    { signal: AbortSignal.timeout(10_000), cache: 'no-store' },
  );
  if (!res.ok) {
    throw new Error(`Status check failed (${res.status})`);
  }
  return res.json() as Promise<ApplicantStatusDto>;
}

/** Public — starts a Paystack checkout for the application fee. No auth token. */
export async function startFeeCheckout(
  applicantId: string,
): Promise<{ authorizationUrl: string; reference: string; accessCode: string }> {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/admissions/${applicantId}/application-fee/checkout`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(15_000),
    },
  );
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(body.message ?? `Checkout failed (${res.status})`);
  }
  return res.json() as Promise<{ authorizationUrl: string; reference: string; accessCode: string }>;
}

// ------- Admin actions (use apiFetch which attaches JWT) -------

export async function listApplicants(status?: string): Promise<ApplicantDto[]> {
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  return apiFetch<ApplicantDto[]>(`/admissions${query}`);
}

export async function getApplicant(id: string): Promise<ApplicantDto> {
  return apiFetch<ApplicantDto>(`/admissions/${id}`);
}

export async function reviewApplicant(
  id: string,
  input: ReviewInput,
): Promise<ApplicantDto> {
  const applicant = await apiFetch<ApplicantDto>(`/admissions/${id}/review`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  revalidatePath(`${ADMISSIONS_PATH}/${id}`);
  revalidatePath(ADMISSIONS_PATH);
  return applicant;
}

export async function convertApplicant(
  id: string,
  input: ConvertInput,
): Promise<{ studentId: string; temporaryPassword: string }> {
  const result = await apiFetch<{ studentId: string; temporaryPassword: string }>(
    `/admissions/${id}/convert`,
    { method: 'POST', body: JSON.stringify(input) },
  );
  revalidatePath(`${ADMISSIONS_PATH}/${id}`);
  revalidatePath(ADMISSIONS_PATH);
  return result;
}
