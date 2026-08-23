# HR / Staff Dashboard

## Who uses this

The **HR Officer** or **Admin Officer** responsible for staff records, payroll, leave, and staff lifecycle, separate from the academic side of staff management (subject/class assignment lives in [School Admin Dashboard](04-dashboard-school-admin.md)).

## Purpose

Give the school a proper digital staff file for every employee — replacing paper personnel files — plus a payroll engine that understands Nigerian statutory deductions, and a leave/appraisal workflow.

## Key Capabilities

### 1. Staff Records
- Full bio-data: name, contact, address, next of kin, qualifications, date of employment, role, department.
- Employment documents: CV, certificates, ID, signed contract — stored per staff member.
- Bank account details for payroll.

### 2. Recruitment (Phase 2)
- Post a vacancy, receive applications, move candidates through a simple pipeline (Applied → Shortlisted → Interviewed → Offered → Hired), then convert a hired candidate directly into a staff record.

### 3. Leave Management
- Staff submit leave requests (annual, sick, maternity/paternity, compassionate) from their own dashboard.
- HR/Admin approves or rejects, with leave balance automatically tracked per staff member per year.

### 4. Payroll Processing (Phase 2)
- Define a salary structure per role/grade level (basic, housing, transport, other allowances).
- Run monthly payroll with automatic **PAYE tax** and **pension** deduction calculations per current Nigerian statutory rates (configurable, since rates/brackets change by law).
- Generate payslips (PDF) per staff member.
- Export bank payment schedule (for salary disbursement via bank transfer).

### 5. Staff Attendance
- Clock-in/clock-out tracking for non-teaching and teaching staff (separate from the academic timetable-based view teachers see in their own dashboard).

### 6. Performance Appraisal (Phase 3)
- Periodic appraisal cycles with structured forms, reviewer sign-off, and historical appraisal record per staff member.

### 7. Training / CPD Tracking (Phase 3)
- Log training/professional development attended per staff member, useful for accreditation and staff growth tracking.

### 8. Disciplinary Records
- Log staff disciplinary incidents/warnings, separate from student discipline records.

### 9. Offboarding
- Exit checklist (handover, asset return, final pay computation) when a staff member leaves.

## Screens

- Staff Directory → Staff Detail (bio-data, documents, employment history)
- Recruitment Pipeline
- Leave Requests (submit/approve)
- Payroll Run
- Payslips
- Staff Attendance
- Appraisal Cycles
- Training Log
- Disciplinary Records
- Offboarding Checklist

## Sample Workflows

**Monthly payroll**: HR confirms the current salary structure and any one-off adjustments (bonus, deduction) → runs payroll for the month → system computes PAYE/pension automatically per staff → HR reviews the summary → approves → payslips are generated and the bank payment schedule is exported.

**Leave request**: Teacher submits a leave request from their own dashboard with dates and reason → HR/Admin sees it in the approval queue → approves → teacher's timetable view flags the covered period, and the Admin can arrange a substitute.

## Notifications received
- New leave request pending approval.
- Payroll run ready for review.
- Staff document/contract nearing expiry (e.g., a fixed-term contract).

## Data exports
- Staff roster (Excel)
- Payslips (PDF, individually or in bulk)
- Bank payment schedule (Excel/CSV, for upload to the school's bank portal)
- Leave balance report (Excel)
