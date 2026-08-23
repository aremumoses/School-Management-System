'use server';

import { revalidatePath } from 'next/cache';
import { apiFetch } from '@/lib/api';
import type {
  ApplyToVacancyInput,
  CandidateDto,
  ConvertCandidateInput,
  ConvertCandidateResultDto,
  CreateHrLeaveRequestInput,
  CreateLeaveTypeInput,
  CreatePayrollRunInput,
  CreateSalaryStructureInput,
  CreateStaffDisciplinaryRecordInput,
  CreateVacancyInput,
  DecideHrLeaveRequestInput,
  HrLeaveRequestDto,
  InitiateOffboardingInput,
  JobVacancyDto,
  LeaveBalanceDto,
  LeaveTypeDto,
  OffboardingChecklistDto,
  PayrollConfigDto,
  PayrollRunDetailDto,
  PayrollRunDto,
  PayslipDto,
  SalaryStructureDto,
  StaffAttendanceDto,
  StaffDisciplinaryRecordDto,
  StaffDocumentDto,
  StaffEmploymentRecordDto,
  UpdateCandidateStageInput,
  UpdateLeaveTypeInput,
  UpdateOffboardingInput,
  UpdatePayrollConfigInput,
  UpdateSalaryStructureInput,
  UpdateVacancyStatusInput,
  UpsertEmploymentRecordInput,
  UpsertLeaveBalanceInput,
  VacancyDetailDto,
} from '@/lib/types/hr';

function revalidateAll() {
  revalidatePath('/hr');
  revalidatePath('/hr/recruitment');
  revalidatePath('/hr/leave');
  revalidatePath('/teacher/leave');
  revalidatePath('/hr/payroll');
  revalidatePath('/hr/payslips');
  revalidatePath('/hr/attendance');
  revalidatePath('/hr/disciplinary');
  revalidatePath('/hr/offboarding');
}

// --- §1 Staff records depth ---

export async function getEmploymentRecord(staffId: string): Promise<StaffEmploymentRecordDto | null> {
  return apiFetch(`/hr/staff/${staffId}/employment-record`);
}

export async function upsertEmploymentRecord(
  staffId: string,
  input: UpsertEmploymentRecordInput,
): Promise<StaffEmploymentRecordDto> {
  const record = await apiFetch<StaffEmploymentRecordDto>(
    `/hr/staff/${staffId}/employment-record`,
    { method: 'POST', body: JSON.stringify(input) },
  );
  revalidatePath(`/admin/staff/${staffId}`);
  return record;
}

export async function listStaffDocuments(staffId: string): Promise<StaffDocumentDto[]> {
  return apiFetch(`/hr/staff/${staffId}/documents`);
}

export async function uploadStaffDocument(
  staffId: string,
  formData: FormData,
): Promise<StaffDocumentDto> {
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
  const expiryDate = formData.get('expiryDate');
  if (typeof expiryDate === 'string' && expiryDate) {
    body.set('expiryDate', expiryDate);
  }
  const doc = await apiFetch<StaffDocumentDto>(`/hr/staff/${staffId}/documents`, {
    method: 'POST',
    body,
  });
  revalidatePath(`/admin/staff/${staffId}`);
  return doc;
}

export async function deleteStaffDocument(staffId: string, documentId: string): Promise<void> {
  await apiFetch(`/hr/staff/documents/${documentId}`, { method: 'DELETE' });
  revalidatePath(`/admin/staff/${staffId}`);
}

// --- §2 Recruitment ---

export async function createVacancy(input: CreateVacancyInput): Promise<JobVacancyDto> {
  const vacancy = await apiFetch<JobVacancyDto>('/hr/vacancies', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  revalidateAll();
  return vacancy;
}

export async function listVacancies(): Promise<JobVacancyDto[]> {
  return apiFetch('/hr/vacancies');
}

export async function getVacancy(id: string): Promise<VacancyDetailDto> {
  return apiFetch(`/hr/vacancies/${id}`);
}

export async function updateVacancyStatus(
  id: string,
  input: UpdateVacancyStatusInput,
): Promise<JobVacancyDto> {
  const vacancy = await apiFetch<JobVacancyDto>(`/hr/vacancies/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  revalidateAll();
  return vacancy;
}

/** Public — no auth attached, but apiFetch is server-only so this still runs from a Server Action. */
export async function applyToVacancy(
  vacancyId: string,
  input: ApplyToVacancyInput,
): Promise<CandidateDto> {
  return apiFetch(`/hr/vacancies/${vacancyId}/apply`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function listCandidates(vacancyId?: string): Promise<CandidateDto[]> {
  return apiFetch(`/hr/candidates${vacancyId ? `?vacancyId=${vacancyId}` : ''}`);
}

export async function updateCandidateStage(
  id: string,
  input: UpdateCandidateStageInput,
): Promise<CandidateDto> {
  const candidate = await apiFetch<CandidateDto>(`/hr/candidates/${id}/stage`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  revalidateAll();
  return candidate;
}

export async function convertCandidateToStaff(
  id: string,
  input: ConvertCandidateInput,
): Promise<ConvertCandidateResultDto> {
  const result = await apiFetch<ConvertCandidateResultDto>(
    `/hr/candidates/${id}/convert-to-staff`,
    { method: 'POST', body: JSON.stringify(input) },
  );
  revalidateAll();
  revalidatePath('/admin/staff');
  return result;
}

// --- §3 Leave management ---

export async function listLeaveTypes(): Promise<LeaveTypeDto[]> {
  return apiFetch('/hr/leave-types');
}

export async function createLeaveType(input: CreateLeaveTypeInput): Promise<LeaveTypeDto> {
  const type = await apiFetch<LeaveTypeDto>('/hr/leave-types', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  revalidateAll();
  return type;
}

export async function updateLeaveType(
  id: string,
  input: UpdateLeaveTypeInput,
): Promise<LeaveTypeDto> {
  const type = await apiFetch<LeaveTypeDto>(`/hr/leave-types/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  revalidateAll();
  return type;
}

export async function myLeaveBalances(year?: number): Promise<LeaveBalanceDto[]> {
  return apiFetch(`/hr/leave-balances/mine${year ? `?year=${year}` : ''}`);
}

export async function listAllLeaveBalances(year?: number): Promise<LeaveBalanceDto[]> {
  return apiFetch(`/hr/leave-balances${year ? `?year=${year}` : ''}`);
}

export async function upsertLeaveBalance(
  input: UpsertLeaveBalanceInput,
): Promise<LeaveBalanceDto> {
  const balance = await apiFetch<LeaveBalanceDto>('/hr/leave-balances', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  revalidateAll();
  return balance;
}

export async function createLeaveRequest(
  input: CreateHrLeaveRequestInput,
): Promise<HrLeaveRequestDto> {
  const request = await apiFetch<HrLeaveRequestDto>('/hr/leave-requests', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  revalidateAll();
  return request;
}

export async function myLeaveRequests(): Promise<HrLeaveRequestDto[]> {
  return apiFetch('/hr/leave-requests/mine');
}

export async function listAllLeaveRequests(
  status?: 'PENDING' | 'APPROVED' | 'REJECTED',
): Promise<HrLeaveRequestDto[]> {
  return apiFetch(`/hr/leave-requests${status ? `?status=${status}` : ''}`);
}

export async function decideLeaveRequest(
  id: string,
  input: DecideHrLeaveRequestInput,
): Promise<HrLeaveRequestDto> {
  const request = await apiFetch<HrLeaveRequestDto>(`/hr/leave-requests/${id}/decide`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  revalidateAll();
  return request;
}

// --- §4 Payroll ---

export async function getPayrollConfig(): Promise<PayrollConfigDto> {
  return apiFetch('/hr/payroll/config');
}

export async function updatePayrollConfig(
  input: UpdatePayrollConfigInput,
): Promise<PayrollConfigDto> {
  const config = await apiFetch<PayrollConfigDto>('/hr/payroll/config', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  revalidateAll();
  return config;
}

export async function listSalaryStructures(): Promise<SalaryStructureDto[]> {
  return apiFetch('/hr/payroll/salary-structures');
}

export async function createSalaryStructure(
  input: CreateSalaryStructureInput,
): Promise<SalaryStructureDto> {
  const structure = await apiFetch<SalaryStructureDto>('/hr/payroll/salary-structures', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  revalidateAll();
  return structure;
}

export async function updateSalaryStructure(
  id: string,
  input: UpdateSalaryStructureInput,
): Promise<SalaryStructureDto> {
  const structure = await apiFetch<SalaryStructureDto>(`/hr/payroll/salary-structures/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  revalidateAll();
  return structure;
}

export async function createPayrollRun(input: CreatePayrollRunInput): Promise<PayrollRunDetailDto> {
  const run = await apiFetch<PayrollRunDetailDto>('/hr/payroll/runs', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  revalidateAll();
  return run;
}

export async function listPayrollRuns(): Promise<PayrollRunDto[]> {
  return apiFetch('/hr/payroll/runs');
}

export async function getPayrollRun(id: string): Promise<PayrollRunDetailDto> {
  return apiFetch(`/hr/payroll/runs/${id}`);
}

export async function markPayrollRunReviewed(id: string): Promise<PayrollRunDto> {
  const run = await apiFetch<PayrollRunDto>(`/hr/payroll/runs/${id}/review`, {
    method: 'PATCH',
  });
  revalidateAll();
  return run;
}

export async function approvePayrollRun(id: string): Promise<PayrollRunDto> {
  const run = await apiFetch<PayrollRunDto>(`/hr/payroll/runs/${id}/approve`, {
    method: 'PATCH',
  });
  revalidateAll();
  return run;
}

export async function listPayslips(staffId?: string, payrollRunId?: string): Promise<PayslipDto[]> {
  const params = new URLSearchParams();
  if (staffId) params.set('staffId', staffId);
  if (payrollRunId) params.set('payrollRunId', payrollRunId);
  const qs = params.toString();
  return apiFetch(`/hr/payroll/payslips${qs ? `?${qs}` : ''}`);
}

// --- §5 Staff attendance ---

export async function clockIn(): Promise<StaffAttendanceDto> {
  const record = await apiFetch<StaffAttendanceDto>('/hr/staff-attendance/clock-in', {
    method: 'POST',
  });
  revalidatePath('/hr/attendance');
  return record;
}

export async function clockOut(): Promise<StaffAttendanceDto> {
  const record = await apiFetch<StaffAttendanceDto>('/hr/staff-attendance/clock-out', {
    method: 'POST',
  });
  revalidatePath('/hr/attendance');
  return record;
}

export async function getTodayAttendance(): Promise<StaffAttendanceDto | null> {
  return apiFetch('/hr/staff-attendance/today');
}

export async function queryStaffAttendance(params: {
  staffId?: string;
  from?: string;
  to?: string;
}): Promise<StaffAttendanceDto[]> {
  const qs = new URLSearchParams();
  if (params.staffId) qs.set('staffId', params.staffId);
  if (params.from) qs.set('from', params.from);
  if (params.to) qs.set('to', params.to);
  const query = qs.toString();
  return apiFetch(`/hr/staff-attendance${query ? `?${query}` : ''}`);
}

// --- §6 Disciplinary records ---

export async function createDisciplinaryRecord(
  input: CreateStaffDisciplinaryRecordInput,
): Promise<StaffDisciplinaryRecordDto> {
  const record = await apiFetch<StaffDisciplinaryRecordDto>('/hr/disciplinary-records', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  revalidateAll();
  return record;
}

export async function listDisciplinaryRecords(staffId?: string): Promise<StaffDisciplinaryRecordDto[]> {
  return apiFetch(`/hr/disciplinary-records${staffId ? `?staffId=${staffId}` : ''}`);
}

// --- §7 Offboarding ---

export async function initiateOffboarding(
  input: InitiateOffboardingInput,
): Promise<OffboardingChecklistDto> {
  const checklist = await apiFetch<OffboardingChecklistDto>('/hr/offboarding', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  revalidateAll();
  return checklist;
}

export async function listOffboarding(): Promise<OffboardingChecklistDto[]> {
  return apiFetch('/hr/offboarding');
}

export async function updateOffboarding(
  id: string,
  input: UpdateOffboardingInput,
): Promise<OffboardingChecklistDto> {
  const checklist = await apiFetch<OffboardingChecklistDto>(`/hr/offboarding/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  revalidateAll();
  return checklist;
}

export async function completeOffboarding(id: string): Promise<OffboardingChecklistDto> {
  const checklist = await apiFetch<OffboardingChecklistDto>(`/hr/offboarding/${id}/complete`, {
    method: 'PATCH',
  });
  revalidateAll();
  revalidatePath('/admin/staff');
  return checklist;
}
