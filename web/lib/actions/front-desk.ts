'use server';

import { revalidatePath } from 'next/cache';
import { apiFetch } from '@/lib/api';
import type {
  AddPickupPersonInput,
  AssetMovementDto,
  CreatePickupRequestInput,
  FacilityIncidentDto,
  FrontDeskOverviewDto,
  GatePassDto,
  IssueGatePassInput,
  LateArrivalDto,
  LogAssetMovementInput,
  LogFacilityIncidentInput,
  LogLateArrivalInput,
  PickupPersonDto,
  PickupRequestDto,
  QrResolveResponse,
  SignInVisitorInput,
  VisitorDto,
} from '@/lib/types/front-desk';

// --- Digital ID / QR gate-scan (Stage 29) ---

export async function resolveStudentByQr(qrToken: string): Promise<QrResolveResponse> {
  return apiFetch<QrResolveResponse>(`/students/qr/${encodeURIComponent(qrToken)}`);
}

// --- Pickup authorization (parent) ---

export async function listPickupPersons(studentId: string): Promise<PickupPersonDto[]> {
  return apiFetch<PickupPersonDto[]>(`/students/${studentId}/pickup-persons`);
}

export async function addPickupPerson(
  studentId: string,
  input: AddPickupPersonInput,
): Promise<PickupPersonDto> {
  const person = await apiFetch<PickupPersonDto>(`/students/${studentId}/pickup-persons`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
  revalidatePath('/parent/pickup-authorization');
  return person;
}

export async function removePickupPerson(studentId: string, personId: string): Promise<void> {
  await apiFetch(`/students/${studentId}/pickup-persons/${personId}`, { method: 'DELETE' });
  revalidatePath('/parent/pickup-authorization');
}

export async function createPickupRequest(
  studentId: string,
  input: CreatePickupRequestInput,
): Promise<void> {
  await apiFetch(`/students/${studentId}/pickup-requests`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
  revalidatePath('/parent/pickup-authorization');
  revalidatePath('/front-desk');
}

export async function listPickupRequests(): Promise<PickupRequestDto[]> {
  return apiFetch<PickupRequestDto[]>('/pickup-requests');
}

// --- Visitors ---

export async function listVisitors(date?: string): Promise<VisitorDto[]> {
  const qs = date ? `?date=${date}` : '';
  return apiFetch<VisitorDto[]>(`/visitors${qs}`);
}

export async function signInVisitor(input: SignInVisitorInput): Promise<VisitorDto> {
  const visitor = await apiFetch<VisitorDto>('/visitors/sign-in', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  revalidatePath('/front-desk/visitors');
  return visitor;
}

export async function signOutVisitor(id: string): Promise<void> {
  await apiFetch(`/visitors/${id}/sign-out`, { method: 'POST' });
  revalidatePath('/front-desk/visitors');
}

// --- Gate pass ---

export async function listGatePasses(date?: string): Promise<GatePassDto[]> {
  const qs = date ? `?date=${date}` : '';
  return apiFetch<GatePassDto[]>(`/gate-pass${qs}`);
}

export async function issueGatePass(input: IssueGatePassInput): Promise<GatePassDto> {
  const pass = await apiFetch<GatePassDto>('/gate-pass', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  revalidatePath('/front-desk/gate-pass');
  return pass;
}

export async function resolveGatePass(
  id: string,
  decision: 'CONFIRM' | 'REJECT',
): Promise<GatePassDto> {
  const pass = await apiFetch<GatePassDto>(`/gate-pass/${id}/resolve`, {
    method: 'POST',
    body: JSON.stringify({ decision }),
  });
  revalidatePath('/front-desk/gate-pass');
  return pass;
}

// --- Late arrivals ---

export async function listLateArrivals(date?: string): Promise<LateArrivalDto[]> {
  const qs = date ? `?date=${date}` : '';
  return apiFetch<LateArrivalDto[]>(`/late-arrivals${qs}`);
}

export async function logLateArrival(input: LogLateArrivalInput): Promise<LateArrivalDto> {
  const arrival = await apiFetch<LateArrivalDto>('/late-arrivals', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  revalidatePath('/front-desk/late-arrivals');
  return arrival;
}

// --- Facility incidents ---

export async function listFacilityIncidents(): Promise<FacilityIncidentDto[]> {
  return apiFetch<FacilityIncidentDto[]>('/facility-incidents');
}

export async function logFacilityIncident(
  input: LogFacilityIncidentInput,
): Promise<FacilityIncidentDto> {
  const incident = await apiFetch<FacilityIncidentDto>('/facility-incidents', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  revalidatePath('/front-desk/incidents');
  return incident;
}

// --- Asset movements ---

export async function listAssetMovements(): Promise<AssetMovementDto[]> {
  return apiFetch<AssetMovementDto[]>('/asset-movements');
}

export async function logAssetMovement(
  input: LogAssetMovementInput,
): Promise<AssetMovementDto> {
  const movement = await apiFetch<AssetMovementDto>('/asset-movements', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  revalidatePath('/front-desk/asset-movement');
  return movement;
}

// --- Overview ---

export async function getFrontDeskOverview(): Promise<FrontDeskOverviewDto> {
  return apiFetch<FrontDeskOverviewDto>('/front-desk/overview');
}
