import type { AppRole } from '@/types/next-auth';

/** Mirrors api/src/modules/discipline/incidents.controller.ts's CAN_LOG_ROLES. */
export const CAN_LOG_INCIDENT_ROLES: AppRole[] = [
  'ADMIN',
  'VICE_PRINCIPAL',
  'CLASS_TEACHER',
  'SUBJECT_TEACHER',
  'HOSTEL_WARDEN',
];

/** Mirrors CAN_PROPOSE_ACTION_ROLES — same list minus SUBJECT_TEACHER ("log only"). */
export const CAN_PROPOSE_ACTION_ROLES: AppRole[] = [
  'ADMIN',
  'VICE_PRINCIPAL',
  'CLASS_TEACHER',
  'HOSTEL_WARDEN',
];

export function hasAnyRole(roles: AppRole[], allowed: AppRole[]): boolean {
  return allowed.some((role) => roles.includes(role));
}
