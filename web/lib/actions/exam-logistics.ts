'use server';

import { revalidatePath } from 'next/cache';
import { apiFetch } from '@/lib/api';
import type {
  AllocateSeatsInput,
  AssignInvigilatorInput,
  CaSummaryDto,
  CreateExamHallInput,
  CreateExamSessionInput,
  CreateExternalExamCandidateInput,
  CreateMalpracticeIncidentInput,
  ExamHallDto,
  ExamSessionDto,
  ExternalExamCandidateDto,
  InvigilationDutyDto,
  ManualSeatAllocationInput,
  MalpracticeIncidentDto,
  PassRateRow,
  RosterSessionDto,
  SeatAllocationDto,
  SubjectComparisonRow,
  UpdateExamHallInput,
  UpdateExamSessionInput,
  UpdateExternalExamCandidateInput,
} from '@/lib/types/exam-logistics';

function revalidateAll() {
  revalidatePath('/exam-officer/exam-timetable');
  revalidatePath('/exam-officer/invigilation');
  revalidatePath('/exam-officer/external-exams');
  revalidatePath('/exam-officer/malpractice');
  revalidatePath('/exam-officer/statistics');
}

// --- Exam sessions ---

export async function listExamSessions(termId?: string, armId?: string): Promise<ExamSessionDto[]> {
  const q = new URLSearchParams();
  if (termId) q.set('termId', termId);
  if (armId) q.set('armId', armId);
  const qs = q.toString();
  return apiFetch<ExamSessionDto[]>(`/exam-sessions${qs ? `?${qs}` : ''}`);
}

export async function createExamSession(input: CreateExamSessionInput): Promise<ExamSessionDto> {
  const session = await apiFetch<ExamSessionDto>('/exam-sessions', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  revalidateAll();
  return session;
}

export async function updateExamSession(
  id: string,
  input: UpdateExamSessionInput,
): Promise<ExamSessionDto> {
  const session = await apiFetch<ExamSessionDto>(`/exam-sessions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  revalidateAll();
  return session;
}

export async function deleteExamSession(id: string): Promise<void> {
  await apiFetch(`/exam-sessions/${id}`, { method: 'DELETE' });
  revalidateAll();
}

// --- Halls ---

export async function listExamHalls(): Promise<ExamHallDto[]> {
  return apiFetch<ExamHallDto[]>('/exam-sessions/halls');
}

export async function createExamHall(input: CreateExamHallInput): Promise<ExamHallDto> {
  const hall = await apiFetch<ExamHallDto>('/exam-sessions/halls', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  revalidateAll();
  return hall;
}

export async function updateExamHall(
  id: string,
  input: UpdateExamHallInput,
): Promise<ExamHallDto> {
  const hall = await apiFetch<ExamHallDto>(`/exam-sessions/halls/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  revalidateAll();
  return hall;
}

export async function deleteExamHall(id: string): Promise<void> {
  await apiFetch(`/exam-sessions/halls/${id}`, { method: 'DELETE' });
  revalidateAll();
}

// --- Seat allocation ---

export async function getSeatAllocations(examSessionId: string): Promise<SeatAllocationDto[]> {
  return apiFetch<SeatAllocationDto[]>(`/exam-sessions/${examSessionId}/seat-allocations`);
}

export async function autoAllocateSeats(
  examSessionId: string,
  input: AllocateSeatsInput,
): Promise<SeatAllocationDto[]> {
  const allocations = await apiFetch<SeatAllocationDto[]>(
    `/exam-sessions/${examSessionId}/allocate-seats`,
    { method: 'POST', body: JSON.stringify(input) },
  );
  revalidateAll();
  return allocations;
}

export async function manualAllocateSeat(
  examSessionId: string,
  input: ManualSeatAllocationInput,
): Promise<SeatAllocationDto[]> {
  const allocations = await apiFetch<SeatAllocationDto[]>(
    `/exam-sessions/${examSessionId}/seat-allocations`,
    { method: 'POST', body: JSON.stringify(input) },
  );
  revalidateAll();
  return allocations;
}

// --- Invigilation ---

export async function listSessionInvigilators(
  examSessionId: string,
): Promise<InvigilationDutyDto[]> {
  return apiFetch<InvigilationDutyDto[]>(`/exam-sessions/${examSessionId}/invigilators`);
}

export async function assignInvigilator(
  examSessionId: string,
  input: AssignInvigilatorInput,
): Promise<InvigilationDutyDto> {
  const duty = await apiFetch<InvigilationDutyDto>(
    `/exam-sessions/${examSessionId}/invigilators`,
    { method: 'POST', body: JSON.stringify(input) },
  );
  revalidateAll();
  return duty;
}

export async function removeInvigilator(examSessionId: string, staffId: string): Promise<void> {
  await apiFetch(`/exam-sessions/${examSessionId}/invigilators/${staffId}`, {
    method: 'DELETE',
  });
  revalidateAll();
}

export async function getInvigilationRoster(termId: string): Promise<RosterSessionDto[]> {
  return apiFetch<RosterSessionDto[]>(`/invigilation/roster?termId=${termId}`);
}

// --- External exams ---

export async function listExternalExamCandidates(
  examBody?: string,
  sessionYear?: number,
): Promise<ExternalExamCandidateDto[]> {
  const q = new URLSearchParams();
  if (examBody) q.set('examBody', examBody);
  if (sessionYear) q.set('sessionYear', String(sessionYear));
  const qs = q.toString();
  return apiFetch<ExternalExamCandidateDto[]>(`/external-exams/candidates${qs ? `?${qs}` : ''}`);
}

export async function createExternalExamCandidate(
  input: CreateExternalExamCandidateInput,
): Promise<ExternalExamCandidateDto> {
  const candidate = await apiFetch<ExternalExamCandidateDto>('/external-exams/candidates', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  revalidateAll();
  return candidate;
}

export async function updateExternalExamCandidate(
  id: string,
  input: UpdateExternalExamCandidateInput,
): Promise<ExternalExamCandidateDto> {
  const candidate = await apiFetch<ExternalExamCandidateDto>(
    `/external-exams/candidates/${id}`,
    { method: 'PATCH', body: JSON.stringify(input) },
  );
  revalidateAll();
  return candidate;
}

export async function getCaSummary(studentId: string): Promise<CaSummaryDto> {
  return apiFetch<CaSummaryDto>(`/students/${studentId}/ca-summary-for-external-body`);
}

// --- Malpractice ---

export async function listMalpracticeIncidents(): Promise<MalpracticeIncidentDto[]> {
  return apiFetch<MalpracticeIncidentDto[]>('/malpractice-incidents');
}

export async function createMalpracticeIncident(
  input: CreateMalpracticeIncidentInput,
): Promise<MalpracticeIncidentDto> {
  const incident = await apiFetch<MalpracticeIncidentDto>('/malpractice-incidents', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  revalidateAll();
  return incident;
}

// --- Statistics ---

export async function getPassRateStats(
  termId?: string,
  classId?: string,
  subjectId?: string,
): Promise<PassRateRow[]> {
  const q = new URLSearchParams();
  if (termId) q.set('termId', termId);
  if (classId) q.set('classId', classId);
  if (subjectId) q.set('subjectId', subjectId);
  const qs = q.toString();
  return apiFetch<PassRateRow[]>(`/statistics/pass-rate${qs ? `?${qs}` : ''}`);
}

export async function getSubjectComparisonStats(termId?: string): Promise<SubjectComparisonRow[]> {
  const qs = termId ? `?termId=${termId}` : '';
  return apiFetch<SubjectComparisonRow[]>(`/statistics/subject-comparison${qs}`);
}
