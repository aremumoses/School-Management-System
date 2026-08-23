import type { AppRole } from '../../common/types/auth.types';

/**
 * docs/03-roles-and-permissions.md §2 "Communication/broadcast" row grants
 * every staff role at least "E" (edit within their own scope) — only
 * STUDENT/PARENT are "V" (view-only — their GET routes use `@Roles()` with
 * no args instead) and only ADMIN is unscoped "F". Defined once here since
 * every write-side controller in this module needs the identical 12-role
 * list, rather than repeating (and risking drift on) the same array per
 * route.
 */
export const ALL_STAFF_ROLES: AppRole[] = [
  'ADMIN',
  'VICE_PRINCIPAL',
  'HOD',
  'CLASS_TEACHER',
  'SUBJECT_TEACHER',
  'EXAM_OFFICER',
  'BURSAR',
  'LIBRARIAN',
  'HOSTEL_WARDEN',
  'TRANSPORT_OFFICER',
  'HR_OFFICER',
  'FRONT_DESK',
];
