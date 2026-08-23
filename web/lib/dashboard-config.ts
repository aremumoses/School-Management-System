import type { NavIconName } from '@/lib/nav-icons';
import type { AppRole } from '@/types/next-auth';
import type { SchoolModuleId } from '@/lib/school-modules';

export interface NavItem {
  label: string;
  href: string;
  /** Looked up in lib/nav-icons.ts — a name, not a component, because this
   *  list crosses a Server -> Client component boundary (see that file). */
  icon: NavIconName;
  /** Overrides `label` in the mobile bottom tab bar, where a five-column
   *  strip at 375px gives each tab roughly 70px. "Scores & Report Cards"
   *  does not fit in that and truncating it to "Scores & Rep…" is worse
   *  than naming it "Results". */
  shortLabel?: string;
  /** Section heading this item sits under in the sidebar. Design system §5:
   *  a 25-item flat list is unreadable, so every dashboard's nav is grouped
   *  and the groups render in first-appearance order. */
  group: string;
  /** Set when this item belongs to a toggleable module — hidden from the nav
   *  entirely when the school has that module switched off. */
  module?: SchoolModuleId;
  /** Short "what this screen is for" line, shown in the command palette
   *  (design system §5) under the item's name. Optional — omitted where the label
   *  is already unambiguous. */
  hint?: string;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

/** Bucket a flat nav list into its groups, preserving first-appearance order. */
export function groupNavItems(navItems: NavItem[]): NavGroup[] {
  const groups: NavGroup[] = [];
  const byLabel = new Map<string, NavGroup>();
  for (const item of navItems) {
    let group = byLabel.get(item.group);
    if (!group) {
      group = { label: item.group, items: [] };
      byLabel.set(item.group, group);
      groups.push(group);
    }
    group.items.push(item);
  }
  return groups;
}

export interface DashboardConfig {
  segment: string;
  label: string;
  allowedRoles: AppRole[];
  navItems: NavItem[];
  /** Mobile-first (bottom tab bar below `md`) vs sidebar-first staff shell. */
  mobile?: boolean;
  /** Curated subset for the bottom tab bar — design system §5 wants 4-5 items, last one "More". */
  bottomNavLabels?: string[];
  /** Set for a segment that exists solely to serve toggleable module(s) — when
   *  none of these are enabled, the layout renders a "module disabled"
   *  placeholder instead of the page (there's no other dashboard for this
   *  role to fall back to, unlike a single nav item elsewhere). */
  requiresAnyModule?: SchoolModuleId[];
}

/**
 * One entry per dashboard route group. Nav items are pulled from each
 * role's "Screens" list in docs/0X-dashboard-*.md — see the doc comment on
 * each entry below. ADMIN is included in every staff `allowedRoles` array
 * since the Admin has full ("F") permission across nearly every module per
 * docs/03-roles-and-permissions.md §2.
 *
 * Every item carries a `group` and an `icon`. Groups are ordered by first
 * appearance, so the order of items in these arrays sets both the order of
 * the sections and the order within them — keep "Overview" first and the
 * low-traffic sections (Calendar, Settings) last in each list.
 */
export const DASHBOARDS: Record<string, DashboardConfig> = {
  // docs/04-dashboard-school-admin.md
  admin: {
    segment: 'admin',
    label: 'Admin',
    allowedRoles: ['ADMIN', 'VICE_PRINCIPAL'],
    navItems: [
      { group: 'Overview', label: 'Dashboard', href: '/admin', icon: 'layoutDashboard', hint: 'School-wide command centre' },
      { group: 'Overview', label: 'Analytics & Reports', href: '/admin/reports', icon: 'trendingUp', hint: 'Performance, attendance and finance reporting' },

      { group: 'People', label: 'Students Directory', href: '/admin/students', icon: 'graduationCap', hint: 'Every enrolled student' },
      { group: 'People', label: 'Staff Directory', href: '/admin/staff', icon: 'users', hint: 'Teaching and non-teaching staff' },
      { group: 'People', label: 'Admissions', href: '/admin/admissions', icon: 'userPlus', hint: 'Applications and enrolment pipeline' },

      { group: 'Academic', label: 'Academic Sessions', href: '/admin/academics/sessions', icon: 'calendarClock', hint: 'Sessions and terms' },
      { group: 'Academic', label: 'Classes & Arms', href: '/admin/academics/classes', icon: 'school' },
      { group: 'Academic', label: 'Subjects & Curriculum', href: '/admin/academics/subjects', icon: 'bookOpen' },
      { group: 'Academic', label: 'Timetable', href: '/admin/timetable', icon: 'table' },
      { group: 'Academic', label: 'Attendance', href: '/admin/attendance', icon: 'clipboardCheck' },
      { group: 'Academic', label: 'Lesson Note Approvals', href: '/admin/lesson-notes', icon: 'clipboardPen' },

      { group: 'Assessment', label: 'Assessment Structure', href: '/admin/assessment-structure', icon: 'sliders' },
      { group: 'Assessment', label: 'Result Approvals', href: '/admin/results', icon: 'bookCheck' },
      { group: 'Assessment', label: 'Scores Bulk Import', href: '/admin/scores/bulk-import', icon: 'fileSpreadsheet' },

      { group: 'Administration', label: 'Fee Structure', href: '/admin/fees', icon: 'wallet' },
      { group: 'Administration', label: 'Discipline', href: '/admin/discipline', icon: 'gavel' },
      { group: 'Administration', label: 'Clubs', href: '/admin/clubs', icon: 'trophy' },
      { group: 'Administration', label: 'Consent Forms', href: '/admin/consent-forms', icon: 'signature' },
      { group: 'Administration', label: 'Documents', href: '/admin/documents', icon: 'folder' },
      { group: 'Administration', label: 'Audit Log', href: '/admin/audit-log', icon: 'scrollText' },

      { group: 'Communication', label: 'Communication', href: '/admin/communication', icon: 'megaphone', hint: 'Announcements, SMS and email' },
      { group: 'Communication', label: 'Calendar & Events', href: '/admin/calendar', icon: 'calendar' },

      { group: 'Settings', label: 'School Profile', href: '/admin/settings/school', icon: 'building' },
      { group: 'Settings', label: 'Module Toggles', href: '/admin/settings/modules', icon: 'settings' },
      { group: 'Settings', label: 'Permissions', href: '/admin/settings/permissions', icon: 'shieldCheck' },
    ],
  },
  // docs/05-dashboard-teacher.md
  teacher: {
    segment: 'teacher',
    label: 'Teacher',
    allowedRoles: ['SUBJECT_TEACHER', 'CLASS_TEACHER', 'HOD', 'ADMIN'],
    navItems: [
      { group: 'Overview', label: 'My Classes', href: '/teacher', icon: 'layoutDashboard' },
      { group: 'Overview', label: 'My Timetable', href: '/teacher/timetable', icon: 'table' },

      { group: 'Teaching', label: 'Attendance', href: '/teacher/attendance', icon: 'clipboardCheck' },
      { group: 'Teaching', label: 'Lesson Notes', href: '/teacher/lesson-notes', icon: 'clipboardPen' },
      { group: 'Teaching', label: 'Assignments', href: '/teacher/assignments', icon: 'clipboardList' },
      { group: 'Teaching', label: 'Resources', href: '/teacher/resources', icon: 'folder' },

      { group: 'Assessment', label: 'Score Entry', href: '/teacher/scores', icon: 'fileSpreadsheet' },
      { group: 'Assessment', label: 'Gradebook', href: '/teacher/gradebook', icon: 'bookCheck' },
      { group: 'Assessment', label: 'CBT Tests', href: '/teacher/cbt', icon: 'timer', module: 'CBT' },

      { group: 'My Students', label: 'Class Teacher Tools', href: '/teacher/class-ratings', icon: 'award' },
      { group: 'My Students', label: 'Discipline', href: '/teacher/discipline', icon: 'gavel' },

      { group: 'Communication', label: 'Messages', href: '/teacher/messages', icon: 'messageSquare' },
      { group: 'Communication', label: 'Notices', href: '/teacher/notices', icon: 'megaphone' },
      { group: 'Communication', label: 'Calendar', href: '/teacher/calendar', icon: 'calendar' },

      { group: 'Personal', label: 'Leave Requests', href: '/teacher/leave', icon: 'plane' },
    ],
  },
  // docs/08-dashboard-bursar.md
  bursar: {
    segment: 'bursar',
    label: 'Bursar',
    allowedRoles: ['BURSAR', 'ADMIN'],
    navItems: [
      { group: 'Overview', label: 'Finance Overview', href: '/bursar', icon: 'layoutDashboard' },
      { group: 'Overview', label: 'Financial Reports', href: '/bursar/reports', icon: 'trendingUp' },

      { group: 'Billing', label: 'Fee Structure', href: '/bursar/fee-structures', icon: 'wallet' },
      { group: 'Billing', label: 'Invoices', href: '/bursar/invoices', icon: 'fileText' },
      { group: 'Billing', label: 'Installment Plans', href: '/bursar/installments', icon: 'calendarClock' },

      { group: 'Collections', label: 'Record Payment', href: '/bursar/payments/record', icon: 'handCoins' },
      { group: 'Collections', label: 'Receipts', href: '/bursar/receipts', icon: 'receipt' },
      { group: 'Collections', label: 'Defaulters', href: '/bursar/defaulters', icon: 'alert' },

      { group: 'Accounting', label: 'Expenses', href: '/bursar/expenses', icon: 'banknote' },

      { group: 'Communication', label: 'Calendar', href: '/bursar/calendar', icon: 'calendar' },
    ],
  },
  // docs/09-dashboard-exam-officer.md
  'exam-officer': {
    segment: 'exam-officer',
    label: 'Exam Officer',
    allowedRoles: ['EXAM_OFFICER', 'ADMIN'],
    navItems: [
      { group: 'Overview', label: 'Overview', href: '/exam-officer', icon: 'layoutDashboard' },
      { group: 'Overview', label: 'Statistical Analysis', href: '/exam-officer/statistics', icon: 'trendingUp' },

      { group: 'Scheduling', label: 'Exam Timetable', href: '/exam-officer/exam-timetable', icon: 'table' },
      { group: 'Scheduling', label: 'Invigilation Roster', href: '/exam-officer/invigilation', icon: 'userCheck' },
      { group: 'Scheduling', label: 'CBT Scheduling', href: '/exam-officer/cbt-scheduling', icon: 'timer', module: 'CBT' },

      { group: 'Assessment', label: 'Assessment Structure', href: '/exam-officer/assessment-structure', icon: 'sliders' },
      { group: 'Assessment', label: 'Question Bank', href: '/exam-officer/question-bank', icon: 'bookMarked', module: 'CBT' },

      { group: 'Results', label: 'Broadsheet', href: '/exam-officer/broadsheet', icon: 'fileSpreadsheet' },
      { group: 'Results', label: 'Result Approvals', href: '/exam-officer/result-approvals', icon: 'bookCheck' },
      { group: 'Results', label: 'Transcripts', href: '/exam-officer/transcripts', icon: 'fileBadge' },

      { group: 'Records', label: 'External Exam Registration', href: '/exam-officer/external-exams', icon: 'clipboardList' },
      { group: 'Records', label: 'Malpractice Log', href: '/exam-officer/malpractice', icon: 'alert' },

      { group: 'Communication', label: 'Calendar', href: '/exam-officer/calendar', icon: 'calendar' },
    ],
  },
  // docs/10-dashboard-librarian.md
  librarian: {
    segment: 'librarian',
    label: 'Librarian',
    allowedRoles: ['LIBRARIAN', 'ADMIN'],
    requiresAnyModule: ['LIBRARY'],
    navItems: [
      { group: 'Overview', label: 'Catalog', href: '/librarian', icon: 'library' },
      { group: 'Overview', label: 'Library Analytics', href: '/librarian/analytics', icon: 'trendingUp' },

      { group: 'Circulation', label: 'Issue & Return', href: '/librarian/circulation', icon: 'bookOpen' },
      { group: 'Circulation', label: 'Members & Loans', href: '/librarian/members', icon: 'contact' },
      { group: 'Circulation', label: 'Reservations', href: '/librarian/reservations', icon: 'bookMarked' },
      { group: 'Circulation', label: 'Overdue & Fines', href: '/librarian/overdue', icon: 'alert' },

      { group: 'Collection', label: 'Digital Resources', href: '/librarian/digital-resources', icon: 'folder' },

      { group: 'Communication', label: 'Calendar', href: '/librarian/calendar', icon: 'calendar' },
    ],
  },
  // docs/11-dashboard-hostel-transport.md (Parts A + B combined)
  'hostel-transport': {
    segment: 'hostel-transport',
    label: 'Hostel & Transport',
    allowedRoles: ['HOSTEL_WARDEN', 'TRANSPORT_OFFICER', 'ADMIN'],
    requiresAnyModule: ['HOSTEL', 'TRANSPORT'],
    navItems: [
      { group: 'Overview', label: 'Overview', href: '/hostel-transport', icon: 'layoutDashboard' },

      { group: 'Hostel', label: 'Room & Bed Allocation', href: '/hostel-transport/rooms', icon: 'bed', module: 'HOSTEL' },
      { group: 'Hostel', label: 'Boarder Roster', href: '/hostel-transport/boarders', icon: 'users', module: 'HOSTEL' },
      { group: 'Hostel', label: 'Roll-Call', href: '/hostel-transport/roll-call', icon: 'clipboardCheck', module: 'HOSTEL' },
      { group: 'Hostel', label: 'Visitation Log', href: '/hostel-transport/visitation', icon: 'doorOpen', module: 'HOSTEL' },
      { group: 'Hostel', label: 'Inventory', href: '/hostel-transport/inventory', icon: 'boxes', module: 'HOSTEL' },
      // Stage 31 audit: backend has supported HOSTEL_WARDEN logging/proposing
      // discipline actions since Stage 9 (see lib/discipline-roles.ts), but no
      // nav entry or page ever surfaced it — reuses the same Incident
      // components as /admin/discipline, just under this segment's own gate.
      { group: 'Hostel', label: 'Discipline', href: '/hostel-transport/discipline', icon: 'gavel', module: 'HOSTEL' },

      { group: 'Transport', label: 'Routes & Stops', href: '/hostel-transport/routes', icon: 'route', module: 'TRANSPORT' },
      { group: 'Transport', label: 'Student-Route Assignment', href: '/hostel-transport/route-assignment', icon: 'bus', module: 'TRANSPORT' },
      { group: 'Transport', label: 'Driver & Conductor Records', href: '/hostel-transport/drivers', icon: 'idCard', module: 'TRANSPORT' },
      { group: 'Transport', label: 'Pickup & Drop Attendance', href: '/hostel-transport/pickup-attendance', icon: 'clipboardCheck', module: 'TRANSPORT' },
      { group: 'Transport', label: 'Vehicle Maintenance', href: '/hostel-transport/maintenance', icon: 'wrench', module: 'TRANSPORT' },

      { group: 'Communication', label: 'Calendar', href: '/hostel-transport/calendar', icon: 'calendar' },
    ],
  },
  // docs/12-dashboard-hr-staff.md
  hr: {
    segment: 'hr',
    label: 'HR',
    allowedRoles: ['HR_OFFICER', 'ADMIN'],
    navItems: [
      { group: 'Overview', label: 'Staff Directory', href: '/hr', icon: 'users' },

      { group: 'Hiring', label: 'Recruitment', href: '/hr/recruitment', icon: 'handshake' },
      { group: 'Hiring', label: 'Offboarding', href: '/hr/offboarding', icon: 'doorOpen' },

      { group: 'Time & Pay', label: 'Leave Requests', href: '/hr/leave', icon: 'plane' },
      { group: 'Time & Pay', label: 'Staff Attendance', href: '/hr/attendance', icon: 'clipboardCheck' },
      { group: 'Time & Pay', label: 'Payroll', href: '/hr/payroll', icon: 'landmark' },
      { group: 'Time & Pay', label: 'Payslips', href: '/hr/payslips', icon: 'receipt' },

      { group: 'Development', label: 'Appraisals', href: '/hr/appraisals', icon: 'award' },
      { group: 'Development', label: 'Training Log', href: '/hr/training', icon: 'graduationCap' },
      { group: 'Development', label: 'Disciplinary Records', href: '/hr/disciplinary', icon: 'gavel' },

      { group: 'Communication', label: 'Calendar', href: '/hr/calendar', icon: 'calendar' },
    ],
  },
  // docs/13-dashboard-front-desk-security.md
  'front-desk': {
    segment: 'front-desk',
    label: 'Front Desk',
    allowedRoles: ['FRONT_DESK', 'ADMIN'],
    navItems: [
      { group: 'Overview', label: 'Gate Overview', href: '/front-desk', icon: 'layoutDashboard' },

      { group: 'Gate', label: 'Visitor Sign-In / Out', href: '/front-desk/visitors', icon: 'contact' },
      { group: 'Gate', label: 'Gate Pass', href: '/front-desk/gate-pass', icon: 'fileBadge' },
      { group: 'Gate', label: 'Pickup Verification', href: '/front-desk/pickup-verification', icon: 'userCheck' },
      { group: 'Gate', label: 'Late Arrivals', href: '/front-desk/late-arrivals', icon: 'timer' },

      { group: 'Records', label: 'Incident Log', href: '/front-desk/incidents', icon: 'alert' },
      { group: 'Records', label: 'Asset Movement', href: '/front-desk/asset-movement', icon: 'package' },

      { group: 'Communication', label: 'Calendar', href: '/front-desk/calendar', icon: 'calendar' },
    ],
  },
  // docs/06-dashboard-student.md
  student: {
    segment: 'student',
    label: 'Student',
    allowedRoles: ['STUDENT'],
    mobile: true,
    bottomNavLabels: ['Home', 'Scores & Report Cards', 'Fee Status', 'Messages', 'More'],
    navItems: [
      { group: 'Overview', label: 'Home', href: '/student', icon: 'home' },
      { group: 'Overview', label: 'Profile', href: '/student/profile', icon: 'idCard' },

      { group: 'My Learning', label: 'Timetable', href: '/student/timetable', icon: 'table' },
      { group: 'My Learning', label: 'Assignments', href: '/student/assignments', icon: 'clipboardList' },
      { group: 'My Learning', label: 'CBT Tests', href: '/student/cbt', icon: 'timer', module: 'CBT' },
      { group: 'My Learning', label: 'E-Library', href: '/student/library', icon: 'library', module: 'LIBRARY' },

      { group: 'My Progress', label: 'Scores & Report Cards', href: '/student/results', icon: 'bookCheck', shortLabel: 'Results' },
      { group: 'My Progress', label: 'Attendance', href: '/student/attendance', icon: 'clipboardCheck' },

      { group: 'School Life', label: 'Fee Status', href: '/student/fees', icon: 'wallet', shortLabel: 'Fees' },
      { group: 'School Life', label: 'Clubs & Activities', href: '/student/clubs', icon: 'trophy' },
      { group: 'School Life', label: 'Documents', href: '/student/documents', icon: 'folder' },

      { group: 'Communication', label: 'Messages', href: '/student/messages', icon: 'messageSquare' },
      { group: 'Communication', label: 'Notices', href: '/student/notices', icon: 'megaphone' },
      { group: 'Communication', label: 'Calendar', href: '/student/calendar', icon: 'calendar' },
    ],
  },
  // docs/07-dashboard-parent.md
  parent: {
    segment: 'parent',
    label: 'Parent',
    allowedRoles: ['PARENT'],
    mobile: true,
    bottomNavLabels: ['Home', 'Attendance', 'Fees & Payments', 'Messages', 'More'],
    navItems: [
      { group: 'Overview', label: 'Home', href: '/parent', icon: 'home' },

      { group: 'My Children', label: 'Attendance', href: '/parent/attendance', icon: 'clipboardCheck' },
      { group: 'My Children', label: 'Report Cards', href: '/parent/results', icon: 'bookCheck' },
      { group: 'My Children', label: 'Homework Tracker', href: '/parent/homework', icon: 'clipboardList' },

      { group: 'Payments', label: 'Fees & Payments', href: '/parent/fees', icon: 'creditCard', shortLabel: 'Fees' },

      { group: 'Communication', label: 'Messages', href: '/parent/messages', icon: 'messageSquare' },
      { group: 'Communication', label: 'Notices & Calendar', href: '/parent/notices', icon: 'megaphone' },
      { group: 'Communication', label: 'Calendar', href: '/parent/calendar', icon: 'calendar' },

      { group: 'Services', label: 'Documents', href: '/parent/documents', icon: 'folder' },
      { group: 'Services', label: 'Consent Forms', href: '/parent/consent', icon: 'signature' },
      { group: 'Services', label: 'Pickup Authorization', href: '/parent/pickup-authorization', icon: 'userCheck' },
      { group: 'Services', label: 'Transport', href: '/parent/transport', icon: 'bus', module: 'TRANSPORT' },
      { group: 'Services', label: 'Boarding Leave Requests', href: '/parent/leave-requests', icon: 'plane', module: 'HOSTEL' },
    ],
  },
};

export function getDashboardConfig(segment: string): DashboardConfig | undefined {
  return DASHBOARDS[segment];
}

export function isRoleAllowed(config: DashboardConfig, roles: AppRole[]): boolean {
  return config.allowedRoles.some((role) => roles.includes(role));
}

/**
 * The single nav item that should read as "active" for the current path —
 * used by both dashboard shells for the sidebar highlight and the header's
 * page title. A plain `pathname.startsWith(item.href + '/')` check on each
 * item independently (the original implementation) double-matches: a
 * segment's own root item (e.g. "Dashboard" -> `/admin`) is a prefix of
 * every other item's href in that segment, so it lit up alongside whatever
 * page was actually open. Picking the *longest* matching href instead picks
 * out the one real match (`/admin/students` beats `/admin` for
 * `/admin/students/123`), and an exact match always wins outright.
 */
export function findActiveNavItem(pathname: string, navItems: NavItem[]): NavItem | undefined {
  const matches = navItems.filter(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );
  if (matches.length === 0) return undefined;
  return matches.reduce((best, item) => (item.href.length > best.href.length ? item : best));
}

/**
 * Where to send a user immediately after login (and where `/login` itself
 * redirects an already-authenticated visitor). ADMIN takes priority over
 * any other role a user might also hold; staff roles take priority over
 * STUDENT/PARENT (which a real user would never hold simultaneously anyway).
 */
const REDIRECT_PRIORITY: { role: AppRole; segment: string }[] = [
  { role: 'ADMIN', segment: 'admin' },
  { role: 'VICE_PRINCIPAL', segment: 'admin' },
  { role: 'BURSAR', segment: 'bursar' },
  { role: 'EXAM_OFFICER', segment: 'exam-officer' },
  { role: 'LIBRARIAN', segment: 'librarian' },
  { role: 'HOSTEL_WARDEN', segment: 'hostel-transport' },
  { role: 'TRANSPORT_OFFICER', segment: 'hostel-transport' },
  { role: 'HR_OFFICER', segment: 'hr' },
  { role: 'FRONT_DESK', segment: 'front-desk' },
  { role: 'HOD', segment: 'teacher' },
  { role: 'CLASS_TEACHER', segment: 'teacher' },
  { role: 'SUBJECT_TEACHER', segment: 'teacher' },
  { role: 'STUDENT', segment: 'student' },
  { role: 'PARENT', segment: 'parent' },
];

export function primaryDashboardPath(roles: AppRole[]): string {
  for (const { role, segment } of REDIRECT_PRIORITY) {
    if (roles.includes(role)) {
      return `/${segment}`;
    }
  }
  return '/login';
}
