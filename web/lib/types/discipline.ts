import type { components } from '@/types/api';

export type CreateIncidentInput = components['schemas']['CreateIncidentDto'];
export type UpdateIncidentInput = components['schemas']['UpdateIncidentDto'];
export type ProposeActionInput = components['schemas']['ProposeActionDto'];
export type ApproveActionInput = components['schemas']['ApproveActionDto'];
export type RejectActionInput = components['schemas']['RejectActionDto'];

export type IncidentSeverity = 'MINOR' | 'MODERATE' | 'SEVERE';
export type DisciplinaryActionType = 'WARNING' | 'SUSPENSION' | 'EXPULSION';
export type DisciplinaryActionStatus = 'PROPOSED' | 'APPROVED' | 'REJECTED';

export interface DisciplinaryActionDto {
  id: string;
  incidentId: string;
  actionType: DisciplinaryActionType;
  status: DisciplinaryActionStatus;
  proposedByStaffId: string;
  decidedByStaffId: string | null;
  decidedAt: string | null;
  decisionNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IncidentDto {
  id: string;
  studentId: string;
  reportedByStaffId: string;
  description: string;
  severity: IncidentSeverity;
  date: string;
  createdAt: string;
  updatedAt: string;
}

export interface IncidentWithActionsDto extends IncidentDto {
  actions: DisciplinaryActionDto[];
}
