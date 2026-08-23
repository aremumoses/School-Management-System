# Hostel & Transport Dashboard

## Who uses this

The **Hostel Warden/Matron** (boarding schools) and the **Transport Officer**. These are grouped in one doc because both are "logistics of getting/keeping students somewhere safely" — in the product they can be separate modules toggled independently in school settings, since many Lagos secondary schools are day-only with no boarding, while some run a school bus service without a hostel, and some do both.

---

## Part A — Hostel / Boarding Management

### Purpose
Replace the warden's notebook with a digital roster, roll-call, and incident log for boarders.

### Key Capabilities

1. **Room & Bed Allocation** — assign each boarder to a hostel/house, room, and bed; track capacity and vacancy.
2. **Boarder Roster** — full list of boarders per hostel/house, searchable by class/room.
3. **Roll-Call Attendance** — morning and evening roll-call marking, separate from the academic daily attendance taken by class teachers, with absconding/absence flags escalated to the Admin and parent immediately.
4. **Visitation Log** — record who visited a boarder, when, and relationship to the student (cross-referenced against authorized-pickup/visitor lists where relevant — see [Front Desk / Security Dashboard](13-dashboard-front-desk-security.md)).
5. **Inventory Tracking** — beddings, furniture, and equipment assigned per room/boarder.
6. **Sick-Bay / Health Log (boarder-specific)** — incidents that happen after hours/on weekends, feeding into the school's general [Health & Wellness Records](02-feature-list.md) (§16).
7. **Hostel-Specific Discipline Log** — incidents that occur within the hostel (after lights-out, etc.), cross-referenced into the main [Discipline & Behavior](02-feature-list.md) (§17) record.
8. **Leave/Outing Requests** — boarder requests to leave campus for the weekend/holiday, with parent consent and warden/admin approval workflow.

### Screens
- Hostel Overview (occupancy, today's roll-call status)
- Room & Bed Allocation
- Boarder Roster
- Roll-Call entry
- Visitation Log
- Inventory
- Hostel Health/Discipline Log
- Leave/Outing Requests

### Sample Workflow
**Evening roll-call**: Warden opens the roll-call screen for their house → marks each boarder present/absent → any absence not pre-approved (via a leave request) immediately alerts the Admin and the boarder's parent.

---

## Part B — Transport Management

### Purpose
Track which students ride which bus, keep parents informed, and tie transport fees into billing.

### Key Capabilities

1. **Route & Bus Management** — define routes, stops, and the bus assigned to each route.
2. **Student-to-Route Assignment** — assign a student to a pickup/drop route and stop.
3. **Driver & Conductor Records** — staff/contractor records, license/verification details.
4. **Pickup/Drop-Off Attendance** — conductor marks boarding/alighting per stop (mobile-friendly check-in), distinct from classroom attendance but reconcilable against it (a student marked present at school but never boarded the school bus is a flag worth surfacing).
5. **Transport Fee Link** — transport fee component flows into the [Fees & Payments Module](15-module-fees-payments.md) as a per-term billable item tied to route distance/zone if the school prices it that way.
6. **Vehicle Maintenance Log** — service history, due-for-service alerts.
7. **Live GPS Tracking (Phase 3)** — parents can see the bus's live location and get an ETA for pickup/drop, addressing a common Lagos-traffic anxiety point for parents.

### Screens
- Transport Overview (routes, buses, today's run status)
- Routes & Stops
- Student-Route Assignment
- Driver/Conductor Records
- Pickup/Drop Attendance
- Vehicle Maintenance Log
- Live Tracking (Phase 3)

### Sample Workflow
**Morning run**: Conductor opens the route's pickup list on their phone → checks off each student as they board → parents of any no-show student get an automatic alert → on arrival at school, a "dropped at school" event reconciles against the day's classroom attendance.

## Notifications received
- Unapproved boarder absence at roll-call (Hostel) → escalated to Admin + parent.
- Student didn't board the assigned bus (Transport) → alert to parent.
- Vehicle maintenance due (Transport) → alert to Transport Officer/Admin.

## Data exports
- Boarder roster & occupancy report (Excel)
- Route manifest per bus (PDF, for the conductor's daily use)
- Vehicle maintenance history (Excel)
