import type { AppRole } from '@/types/next-auth';

export const ROLE_LABELS: Record<AppRole, string> = {
  ADMIN: 'Admin',
  VICE_PRINCIPAL: 'Vice Principal',
  HOD: 'Head of Department',
  CLASS_TEACHER: 'Class Teacher',
  SUBJECT_TEACHER: 'Subject Teacher',
  EXAM_OFFICER: 'Exam Officer',
  BURSAR: 'Bursar',
  LIBRARIAN: 'Librarian',
  HOSTEL_WARDEN: 'Hostel Warden',
  TRANSPORT_OFFICER: 'Transport Officer',
  HR_OFFICER: 'HR Officer',
  FRONT_DESK: 'Front Desk',
  STUDENT: 'Student',
  PARENT: 'Parent',
};
