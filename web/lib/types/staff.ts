import type { components } from '@/types/api';
import type { AppRole } from '@/types/next-auth';

export type CreateStaffInput = components['schemas']['CreateStaffDto'];
export type UpdateStaffInput = components['schemas']['UpdateStaffDto'];
export type AssignRoleInput = components['schemas']['AssignRoleDto'];
export type CreateTeacherAssignmentInput =
  components['schemas']['CreateTeacherAssignmentDto'];

/** The DTO's `roles` field excludes ADMIN/HR_OFFICER-irrelevant roles per the backend enum — re-derive from AppRole minus STUDENT/PARENT (those are synthetic, non-staff roles). */
export type StaffRoleName = Exclude<AppRole, 'STUDENT' | 'PARENT'>;

export interface StaffRoleDto {
  id: string;
  staffId: string;
  role: StaffRoleName;
  createdAt: string;
}

export interface StaffDto {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  employmentDate: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  roles: StaffRoleDto[];
}

/** Only present once, immediately after creation, when no password was supplied. */
export interface CreatedStaffDto extends StaffDto {
  temporaryPassword?: string;
}

export interface TeacherAssignmentDto {
  id: string;
  staffId: string;
  classSubjectId: string;
  termId: string;
  scoreEntryDeadline: string | null;
  createdAt: string;
  // Only present on the list endpoint, which includes these relations —
  // absent on the plain create response. See staff.service.ts.
  classSubject?: {
    id: string;
    classId: string;
    subjectId: string;
    class: { id: string; name: string; level: number };
    subject: { id: string; name: string; code: string | null };
  };
  term?: { id: string; name: string; isCurrent: boolean; sessionId: string };
}
