# Front Desk / Security Dashboard

## Who uses this

The **Receptionist**, **Gatekeeper**, or **Security Officer** stationed at the school's entrance, plus reception staff handling walk-in inquiries.

## Purpose

Give the school a real-time, verifiable log of who is on campus and why — visitors, early pickups, late arrivals — closing a real safety gap in most schools where this is currently an unread paper logbook at best.

## Key Capabilities

### 1. Visitor Sign-In/Out
- Log every visitor: name, phone number, reason for visit, person/department they're visiting, time in/out.
- Optional photo capture at sign-in (via device camera) for an extra identity record.
- Print/issue a visitor badge (simple printable slip) if the school wants a physical marker.

### 2. Gate Pass for Early Pick-Up
- Generate a gate pass when a student needs to leave during school hours, requiring either a pre-authorized request from a parent (via their dashboard) or front-desk verification by phone call to the parent, logged either way.

### 3. Authorized Pickup-Person Verification
- Cross-check anyone collecting a student against the **authorized pickup list** maintained by the parent on their own dashboard (see [Parent Dashboard](07-dashboard-parent.md) §10) — if a person isn't on the list, front desk must escalate to the Admin/parent before releasing the student.

### 4. Late Arrival Logging
- Log students arriving after the official start time, optionally auto-notifying the Class Teacher so the academic attendance record and the gate log stay consistent.

### 5. Incident/Security Log
- Record any security-relevant incident at the gate (unauthorized entry attempt, altercation, lost item) with time, parties involved, and action taken.

### 6. Asset Movement Log (optional)
- Log school assets leaving/entering the premises (e.g., a projector taken off-site for an event) for basic loss prevention.

### 7. Prospective Parent Inquiry CRM (Phase 3)
- Capture walk-in or phone inquiries from prospective parents (name, contact, child's intended class, source of referral) and route them into the Admissions pipeline (see [02-feature-list.md](02-feature-list.md) §2) instead of being lost on a notepad.

## Screens

- Gate Overview (today's visitor count, students out on gate pass, late arrivals)
- Visitor Sign-In/Out
- Gate Pass Issuance
- Pickup Verification
- Late Arrival Log
- Incident Log
- Asset Movement Log
- Prospective Parent Inquiries (Phase 3)

## Sample Workflow

**Early pick-up**: A parent calls ahead or submits an early-pickup request from their dashboard for a specific time → front desk receives the request, and when the pickup person arrives, checks them against the authorized list → if matched, issues a gate pass and the Class Teacher is notified that the student is leaving → if not matched, front desk escalates to the Admin before release.

## Notifications received
- Early-pickup request submitted by a parent, awaiting front-desk action.
- Unrecognized pickup person flagged for escalation.

## Data exports
- Daily visitor log (Excel/PDF)
- Gate pass / early pickup log (Excel/PDF)
- Incident log (Excel/PDF)
