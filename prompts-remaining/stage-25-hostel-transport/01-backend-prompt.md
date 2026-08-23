# Stage 25 — Backend Prompt (Hostel & Transport)

> Copy everything below the line into Claude Code as one message. Assumes Stages 1–9, 11, and 21 (Front Desk — Visitation Log cross-references it) are complete. Closes `docs/22-implementation-status.md` §8 — currently pure nav scaffolding, zero backend. Build both Part A (Hostel) and Part B (Transport) per `docs/11-dashboard-hostel-transport.md`; skip §B.7 Live GPS Tracking, explicitly Phase 3. These two halves are independently toggleable per the spec's own framing (a day-only school has no hostel; a school with no bus service has no transport) — model them as separate sub-modules within one `HostelTransportModule`, not one entangled schema, so Stage 13's module-toggle setting can hide either half independently later.

---

Read `docs/11-dashboard-hostel-transport.md` in full before starting.

## Part A — `HostelModule`

### 1. Room & Bed Allocation
- `Hostel`/`House` model (name, warden staffId), `Room` model (hostelId, roomNumber, bedCapacity), `BedAllocation` (roomId, bedNumber, studentId, allocatedAt). `POST /hostel/rooms/:id/allocate` — `@Roles('HOSTEL_WARDEN', 'ADMIN')`, rejects over-capacity.

### 2. Boarder Roster
- `GET /hostel/boarders?hostelId=&search=` — derived from active `BedAllocation`s, joined with student bio-data.

### 3. Roll-Call
- `RollCall` model: hostelId, date, session (`MORNING` | `EVENING`), entries (a related `RollCallEntry` per boarder: present/absent). `POST /hostel/roll-call` — `@Roles('HOSTEL_WARDEN')`, bulk-marks a house's roll-call in one call (same shape as Stage 4's daily attendance marking — reuse that bulk-upsert pattern, not a one-row-at-a-time API).
- Any `absent` entry **not** covered by an `APPROVED` `LeaveRequest` (below) for that date triggers an immediate escalation: notify Admin + the student's guardian (reuse `BroadcastsService`, new `UNAPPROVED_ABSENCE` template, treated as high-priority per `docs/16-module-communication.md` §2's disciplinary-notice-equivalent urgency).

### 4. Visitation Log
- `Visitation` model: studentId, visitorName, relationship, visitedAt, optional cross-reference to a Stage 21 `AuthorizedPickupPerson` if the name matches (informational only — visiting isn't the same authorization list as pickup, don't conflate them into one check that blocks a legitimate visit). `POST /hostel/visitations`, `GET /hostel/visitations?studentId=`.

### 5. Inventory
- `HostelInventoryItem` model: roomId or studentId (per-room furniture vs per-boarder beddings — support both), description, condition, assignedAt. Simple CRUD, `@Roles('HOSTEL_WARDEN', 'ADMIN')`.

### 6. Sick-Bay / Health Log (boarder-specific, narrow scope)
- `BoarderHealthLog` model: studentId, occurredAt, description, actionTaken, `loggedByStaffId`. This is **narrowly scoped to after-hours/weekend boarder incidents** per the spec — not a general student medical-records system (that's `docs/02-feature-list.md` §16, a separate, larger, not-yet-staged gap — don't expand this into that). Simple CRUD, `@Roles('HOSTEL_WARDEN', 'ADMIN')`.

### 7. Hostel-Specific Discipline Log
- Reuse Stage 9's `Incident`/`DisciplinaryAction` models directly — don't create a parallel discipline model. A hostel incident is logged the same way any other incident is (`POST /incidents`, `HOSTEL_WARDEN` is already in `CAN_LOG_ROLES` per Stage 9's backend — confirm this is still true), just reported by the warden. No new backend work here beyond confirming the existing role grant.

### 8. Leave/Outing Requests
- `LeaveOutingRequest` model: studentId, requestedByGuardianId, fromDate, toDate, reason, status (`PENDING` → `APPROVED` | `REJECTED`), `decidedByStaffId`. `POST /hostel/leave-requests` (`@Roles('PARENT')`, for their own ward), `PATCH /hostel/leave-requests/:id/decide` (`@Roles('HOSTEL_WARDEN', 'ADMIN')`). An `APPROVED` request for a given date range is what roll-call's escalation check (§3) looks for before flagging an absence.

## Part B — `TransportModule`

### 1. Routes & Buses
- `TransportRoute` model: name, busIdentifier, driverId/conductorId (see below). `RouteStop` model: routeId, stopName, order, approximateTime. `POST /transport/routes`, `POST /transport/routes/:id/stops` — `@Roles('TRANSPORT_OFFICER', 'ADMIN')`.

### 2. Student-Route Assignment
- `StudentRouteAssignment` model: studentId, routeId, stopId. `POST /transport/assignments`.

### 3. Driver/Conductor Records
- `TransportStaffRecord` model: name, role (`DRIVER` | `CONDUCTOR`), phone, licenseNumber, licenseExpiryDate, verified (boolean). Simple CRUD.

### 4. Pickup/Drop-Off Attendance
- `TransportAttendance` model: routeId, date, run (`PICKUP` | `DROPOFF`), entries (studentId, boarded boolean, timestamp). `POST /transport/attendance` — bulk-mark per route, same shape as hostel roll-call. Any student marked `boarded: false` on a pickup run triggers a parent alert (reuse `BroadcastsService`) per the spec's "automatic alert" — and expose `GET /transport/attendance/reconciliation?date=` cross-referencing against the day's classroom attendance (Stage 4) for the "present at school but never boarded" flag the spec specifically calls out.

### 5. Transport Fee Link
- No new payment model — reuse Stage 6's `FeeStructure`/`FeeComponent` directly: a transport fee is just a `FeeComponent` (confirm `invoices.service.ts`'s existing comment about transport fees as a conditional component, referenced in `docs/22-implementation-status.md`'s Hostel & Transport dependency note — it already anticipated this). If route/zone-based pricing is needed, that's a `FeeComponent` amount variant keyed by the student's assigned route/zone — extend the existing conditional-component logic rather than building a second fee engine.

### 6. Vehicle Maintenance Log
- `VehicleMaintenanceRecord` model: busIdentifier, serviceDate, description, cost, nextServiceDueDate. `POST /transport/maintenance`, and a scheduled check (reuse `@nestjs/schedule`) alerting the Transport Officer/Admin when `nextServiceDueDate` approaches.

**Done when**: a boarder marked absent at evening roll-call with no approved leave request correctly and immediately notifies both Admin and the parent; an approved leave request correctly suppresses that same alert; a student missing their assigned bus's pickup run triggers a parent alert and shows up in the reconciliation report if they're later marked present in class; and a transport fee correctly appears on a student's invoice the same way any other fee component does.
