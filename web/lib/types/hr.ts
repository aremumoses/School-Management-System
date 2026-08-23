import type { components } from '@/types/api';

// --- Request DTOs (from the generated OpenAPI schema) ---

export type UpsertEmploymentRecordInput = components['schemas']['UpsertEmploymentRecordDto'];
export type CreateVacancyInput = components['schemas']['CreateVacancyDto'];
export type UpdateVacancyStatusInput = components['schemas']['UpdateVacancyStatusDto'];
export type ApplyToVacancyInput = components['schemas']['ApplyToVacancyDto'];
export type UpdateCandidateStageInput = components['schemas']['UpdateCandidateStageDto'];
export type ConvertCandidateInput = components['schemas']['ConvertCandidateDto'];
export type CreateLeaveTypeInput = components['schemas']['CreateLeaveTypeDto'];
export type UpdateLeaveTypeInput = components['schemas']['UpdateLeaveTypeDto'];
export type UpsertLeaveBalanceInput = components['schemas']['UpsertLeaveBalanceDto'];
export type CreateHrLeaveRequestInput = components['schemas']['CreateHrLeaveRequestDto'];
export type DecideHrLeaveRequestInput = components['schemas']['DecideHrLeaveRequestDto'];
export type CreateSalaryStructureInput = components['schemas']['CreateSalaryStructureDto'];
export type UpdateSalaryStructureInput = components['schemas']['UpdateSalaryStructureDto'];
export type UpdatePayrollConfigInput = components['schemas']['UpdatePayrollConfigDto'];
export type CreatePayrollRunInput = components['schemas']['CreatePayrollRunDto'];
export type InitiateOffboardingInput = components['schemas']['InitiateOffboardingDto'];
export type UpdateOffboardingInput = components['schemas']['UpdateOffboardingDto'];
export type CreateStaffDisciplinaryRecordInput =
  components['schemas']['CreateStaffDisciplinaryRecordDto'];

// --- Shared enums ---

export type StaffDocumentType = 'CV' | 'CERTIFICATE' | 'ID' | 'CONTRACT' | 'OTHER';
export type VacancyStatus = 'OPEN' | 'CLOSED';
export type CandidateStage =
  | 'APPLIED'
  | 'SHORTLISTED'
  | 'INTERVIEWED'
  | 'OFFERED'
  | 'HIRED'
  | 'REJECTED';
export type LeaveRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type PayrollRunStatus = 'DRAFT' | 'REVIEWED' | 'APPROVED';

interface StaffRef {
  id?: string;
  firstName: string;
  lastName: string;
}

// --- §1 Staff records depth ---

export interface StaffEmploymentRecordDto {
  id: string;
  staffId: string;
  nextOfKinName: string | null;
  nextOfKinPhone: string | null;
  nextOfKinRelationship: string | null;
  qualifications: string[];
  department: string | null;
  bankName: string | null;
  bankAccountNumber: string | null;
  bankAccountName: string | null;
  salaryStructureId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StaffDocumentDto {
  id: string;
  staffId: string;
  type: StaffDocumentType;
  fileName: string;
  fileUrl: string;
  expiryDate: string | null;
  uploadedAt: string;
}

// --- §2 Recruitment ---

export interface JobVacancyDto {
  id: string;
  title: string;
  description: string;
  postedAt: string;
  closesAt: string | null;
  status: VacancyStatus;
  postedByStaffId: string;
  _count?: { candidates: number };
}

export interface CandidateDto {
  id: string;
  vacancyId: string;
  name: string;
  email: string;
  phone: string | null;
  resumeUrl: string | null;
  stage: CandidateStage;
  appliedAt: string;
  convertedStaffId: string | null;
  vacancy?: { title: string };
}

export interface VacancyDetailDto extends JobVacancyDto {
  candidates: CandidateDto[];
}

export interface ConvertCandidateResultDto {
  staffId: string;
  temporaryPassword?: string;
}

// --- §3 Leave management ---

export interface LeaveTypeDto {
  id: string;
  name: string;
  defaultAnnualDays: number;
}

export interface LeaveBalanceDto {
  id: string;
  staffId: string;
  leaveTypeId: string;
  year: number;
  allocatedDays: number;
  usedDays: number;
  staff?: StaffRef;
  leaveType?: { name: string };
}

export interface HrLeaveRequestDto {
  id: string;
  staffId: string;
  leaveTypeId: string;
  fromDate: string;
  toDate: string;
  reason: string;
  status: LeaveRequestStatus;
  exceedsBalance: boolean;
  decidedByStaffId: string | null;
  decisionNotes: string | null;
  decidedAt: string | null;
  createdAt: string;
  leaveType: { name: string };
  staff?: StaffRef;
}

// --- §4 Payroll ---

export interface SalaryStructureDto {
  id: string;
  gradeLevel: string;
  basicSalary: number;
  housingAllowance: number;
  transportAllowance: number;
  otherAllowances: number;
}

export interface PayeBand {
  upTo: number | null;
  rate: number;
}

export interface PayrollConfigDto {
  payeBands: PayeBand[];
  craFlatAmount: number;
  craPercentOfGross: number;
  craPercentAllowance: number;
  pensionEmployeeRate: number;
}

export interface PayslipDto {
  id: string;
  payrollRunId: string;
  staffId: string;
  grossPay: number;
  payeDeduction: number;
  pensionDeduction: number;
  otherDeductions: number;
  netPay: number;
  pdfUrl: string | null;
  generatedAt: string | null;
  staff?: StaffRef;
  payrollRun?: { month: number; year: number };
}

export interface PayrollRunDto {
  id: string;
  month: number;
  year: number;
  status: PayrollRunStatus;
  runByStaffId: string;
  approvedByStaffId: string | null;
  approvedAt: string | null;
  bankScheduleExportedAt: string | null;
  _count?: { payslips: number };
}

export interface PayrollRunDetailDto extends PayrollRunDto {
  payslips: PayslipDto[];
}

// --- §5 Staff attendance ---

export interface StaffAttendanceDto {
  id: string;
  staffId: string;
  date: string;
  clockIn: string | null;
  clockOut: string | null;
  staff?: StaffRef;
}

// --- §6 Disciplinary records ---

export interface StaffDisciplinaryRecordDto {
  id: string;
  staffId: string;
  description: string;
  actionTaken: string;
  loggedByStaffId: string;
  loggedAt: string;
  staff?: StaffRef;
  loggedBy?: StaffRef;
}

// --- §7 Offboarding ---

export interface ChecklistItem {
  key: string;
  label: string;
  completed: boolean;
  completedAt: string | null;
}

export interface OffboardingChecklistDto {
  id: string;
  staffId: string;
  items: ChecklistItem[];
  finalPayAmount: number | null;
  initiatedByStaffId: string;
  initiatedAt: string;
  completedAt: string | null;
  staff?: StaffRef & { isActive: boolean };
}
