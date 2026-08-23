/**
 * The handful of system templates Stage 7's own automated triggers look up
 * by `key` (absence alert, escalating fee reminders — docs
 * §16-module-communication.md §2/§5). Seeded once via `MessageTemplate.key`
 * uniqueness (see prisma/seed.ts) and editable afterwards by a school to
 * match its own voice (docs §4); the keys themselves are what the cron job
 * and absence listener depend on, never the wording.
 */
export const SYSTEM_TEMPLATE_KEYS = {
  ABSENCE_ALERT: 'ABSENCE_ALERT',
  FEE_REMINDER_T7: 'FEE_REMINDER_T7',
  FEE_REMINDER_T3: 'FEE_REMINDER_T3',
  FEE_REMINDER_DUE: 'FEE_REMINDER_DUE',
  FEE_REMINDER_OVERDUE: 'FEE_REMINDER_OVERDUE',
  DISCIPLINE_ALERT: 'DISCIPLINE_ALERT',
  ADMISSION_WELCOME: 'ADMISSION_WELCOME',
  ASSIGNMENT_POSTED: 'ASSIGNMENT_POSTED',
  ASSIGNMENT_DUE_SOON: 'ASSIGNMENT_DUE_SOON',
  EARLY_PICKUP: 'EARLY_PICKUP',
  UNRECOGNIZED_PICKUP_PERSON: 'UNRECOGNIZED_PICKUP_PERSON',
  LATE_ARRIVAL: 'LATE_ARRIVAL',
  INVIGILATION_DUTY: 'INVIGILATION_DUTY',
  RESERVATION_AVAILABLE: 'RESERVATION_AVAILABLE',
  LIBRARY_OVERDUE: 'LIBRARY_OVERDUE',
  UNAPPROVED_ABSENCE: 'UNAPPROVED_ABSENCE',
  TRANSPORT_NO_SHOW: 'TRANSPORT_NO_SHOW',
  VEHICLE_MAINTENANCE_DUE: 'VEHICLE_MAINTENANCE_DUE',
  LEAVE_REQUEST_PENDING: 'LEAVE_REQUEST_PENDING',
  LEAVE_DECIDED: 'LEAVE_DECIDED',
  PAYROLL_REVIEW_READY: 'PAYROLL_REVIEW_READY',
  STAFF_DOCUMENT_EXPIRING: 'STAFF_DOCUMENT_EXPIRING',
  AT_RISK_FLAGGED: 'AT_RISK_FLAGGED',
  AT_RISK_RESOLVED: 'AT_RISK_RESOLVED',
} as const;

export type SystemTemplateKey =
  (typeof SYSTEM_TEMPLATE_KEYS)[keyof typeof SYSTEM_TEMPLATE_KEYS];

export const DEFAULT_SYSTEM_TEMPLATES: {
  key: SystemTemplateKey;
  name: string;
  body: string;
}[] = [
  {
    key: SYSTEM_TEMPLATE_KEYS.ABSENCE_ALERT,
    name: 'Absence alert',
    body: '{{student_name}} was marked {{status}} today, {{date}}. Please contact the class teacher if this is unexpected.',
  },
  {
    key: SYSTEM_TEMPLATE_KEYS.FEE_REMINDER_T7,
    name: 'Fee reminder — 7 days before due',
    body: "Reminder: {{student_name}}'s school fees of {{balance}} are due on {{due_date}}.",
  },
  {
    key: SYSTEM_TEMPLATE_KEYS.FEE_REMINDER_T3,
    name: 'Fee reminder — 3 days before due',
    body: "{{student_name}}'s school fees of {{balance}} are due on {{due_date}} — 3 days from now. Please make payment to avoid late fees.",
  },
  {
    key: SYSTEM_TEMPLATE_KEYS.FEE_REMINDER_DUE,
    name: 'Fee reminder — due today',
    body: "{{student_name}}'s school fees of {{balance}} are due today, {{due_date}}. Please make payment as soon as possible.",
  },
  {
    key: SYSTEM_TEMPLATE_KEYS.FEE_REMINDER_OVERDUE,
    name: 'Fee reminder — overdue',
    body: "{{student_name}}'s school fees of {{balance}} were due on {{due_date}} and are now overdue. Please settle this balance urgently to avoid further action.",
  },
  {
    key: SYSTEM_TEMPLATE_KEYS.DISCIPLINE_ALERT,
    name: 'Disciplinary action notice',
    body: 'A disciplinary action ({{action_type}}) has been finalized for {{student_name}}. Please contact the school office for details.',
  },
  {
    key: SYSTEM_TEMPLATE_KEYS.ADMISSION_WELCOME,
    name: 'Admission welcome',
    body: "Dear {{guardian_name}}, {{student_name}} has been admitted and enrolled. Admission number: {{admission_number}}. Temporary portal password: {{temporary_password}}. Log in at the school portal to access your child's dashboard.",
  },
  {
    key: SYSTEM_TEMPLATE_KEYS.ASSIGNMENT_POSTED,
    name: 'Assignment posted',
    body: 'New {{subject_name}} assignment for {{class_name}}: "{{title}}" — due {{due_date}}.',
  },
  {
    key: SYSTEM_TEMPLATE_KEYS.ASSIGNMENT_DUE_SOON,
    name: 'Assignment due soon',
    body: 'Reminder: the {{subject_name}} assignment "{{title}}" is due {{due_date}}.',
  },
  {
    key: SYSTEM_TEMPLATE_KEYS.EARLY_PICKUP,
    name: 'Early pickup — gate pass issued',
    body: '{{student_name}} is leaving school early today, collected by {{pickup_person}} ({{time}}). Gate pass issued at the front desk.',
  },
  {
    key: SYSTEM_TEMPLATE_KEYS.UNRECOGNIZED_PICKUP_PERSON,
    name: 'Unrecognized pickup person — escalation',
    body: 'ESCALATION: {{pickup_person}} attempted to collect {{student_name}} but is not on the authorized pickup list. Do not release the student until resolved.',
  },
  {
    key: SYSTEM_TEMPLATE_KEYS.LATE_ARRIVAL,
    name: 'Late arrival logged',
    body: '{{student_name}} arrived late today at {{time}} — logged at the front desk.',
  },
  {
    key: SYSTEM_TEMPLATE_KEYS.INVIGILATION_DUTY,
    name: 'Invigilation duty assigned',
    body: 'You have been assigned as {{role}} invigilator for {{subject_name}} ({{arm_label}}) on {{date}} at {{start_time}}.',
  },
  {
    key: SYSTEM_TEMPLATE_KEYS.RESERVATION_AVAILABLE,
    name: 'Library reservation available',
    body: 'Good news — "{{book_title}}" is back and available. Visit the library to collect it.',
  },
  {
    key: SYSTEM_TEMPLATE_KEYS.LIBRARY_OVERDUE,
    name: 'Library book overdue',
    body: '"{{book_title}}" was due back on {{due_date}} and is now {{days_overdue}} day(s) overdue. Please return it to the library — a fine of {{fine_amount}} has accrued.',
  },
  {
    key: SYSTEM_TEMPLATE_KEYS.UNAPPROVED_ABSENCE,
    name: 'Unapproved boarder absence',
    body: "{{student_name}} was marked ABSENT at {{hostel_name}}'s {{session}} roll-call on {{date}} with no approved leave request on file. Please follow up immediately.",
  },
  {
    key: SYSTEM_TEMPLATE_KEYS.TRANSPORT_NO_SHOW,
    name: 'Missed bus pickup',
    body: "{{student_name}} did not board the school bus on route {{route_name}} on {{date}}. Please confirm your ward's whereabouts.",
  },
  {
    key: SYSTEM_TEMPLATE_KEYS.VEHICLE_MAINTENANCE_DUE,
    name: 'Vehicle service due',
    body: 'Bus {{bus_identifier}} is {{threshold_label}} for its next scheduled service (due {{due_date}}).',
  },
  {
    key: SYSTEM_TEMPLATE_KEYS.LEAVE_REQUEST_PENDING,
    name: 'New leave request pending',
    body: '{{staff_name}} has requested {{leave_type}} leave from {{from_date}} to {{to_date}}. Review it in the HR leave queue.',
  },
  {
    key: SYSTEM_TEMPLATE_KEYS.LEAVE_DECIDED,
    name: 'Leave request decided',
    body: 'Your {{leave_type}} leave request ({{from_date}} to {{to_date}}) has been {{decision}}.{{decision_notes}}',
  },
  {
    key: SYSTEM_TEMPLATE_KEYS.PAYROLL_REVIEW_READY,
    name: 'Payroll run ready for review',
    body: 'The payroll run for {{month}} {{year}} has been computed for {{staff_count}} staff and is ready for your review.',
  },
  {
    key: SYSTEM_TEMPLATE_KEYS.STAFF_DOCUMENT_EXPIRING,
    name: 'Staff document nearing expiry',
    body: "{{staff_name}}'s {{document_type}} is {{threshold_label}} (expires {{expiry_date}}).",
  },
  {
    key: SYSTEM_TEMPLATE_KEYS.AT_RISK_FLAGGED,
    name: 'Student flagged as at-risk',
    body: '{{student_name}} has been flagged as at-risk ({{reason}} below the configured threshold). Please review and follow up.',
  },
  {
    key: SYSTEM_TEMPLATE_KEYS.AT_RISK_RESOLVED,
    name: 'At-risk flag resolved',
    body: '{{student_name}} is no longer flagged as at-risk — {{reason}} has returned above the configured threshold.',
  },
];
