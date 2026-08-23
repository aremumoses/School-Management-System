# Stage 25 — Frontend Prompt (Hostel & Transport)

> Copy everything below the line into Claude Code as one message. Assumes this stage's backend prompt is done.

---

Follow `prompts/00-DESIGN-SYSTEM.md` throughout. §9's mobile-first guidance matters more than usual here — the conductor marking pickup attendance and the warden doing roll-call are both realistically done from a phone in the moment, not a desk.

## Part A — Hostel (`/hostel-transport/...`)

### 1. Hostel Overview (replacing the placeholder home, or a tab if Transport shares the same home)
- Occupancy stat cards (per hostel/house), today's roll-call completion status.

### 2. Room & Bed Allocation (`/hostel-transport/rooms`)
- Hostel/room picker, a bed grid showing occupied/vacant, click a vacant bed to assign a boarder (student picker).

### 3. Boarder Roster (`/hostel-transport/boarders`)
- `DataTable`, searchable by class/room.

### 4. Roll-Call (`/hostel-transport/roll-call`)
- House + session (morning/evening) + date picker, then a fast present/absent toggle list per boarder — mobile-first, large tap targets (44×44px minimum per design system §8), defaulting to present the same way Stage 4's classroom attendance does, with unapproved absences visually flagged immediately (not just on save).

### 5. Visitation Log (`/hostel-transport/visitation`)
- A log form (student, visitor name, relationship, time) and a searchable history list.

### 6. Inventory (`/hostel-transport/inventory`)
- Simple list/form per room or per boarder, condition status badges.

### 7. Leave/Outing Requests
- Parent-side request form lives at `/parent/...` if Stage 25's backend exposes it there (check the nav — if there's no existing Parent nav entry for this, add `{ label: 'Boarding Leave Requests', href: '/parent/leave-requests' }`). Warden-side approval queue at `/hostel-transport/boarders` (or a dedicated tab) — same approve/reject-with-reason pattern used everywhere else in this build.

## Part B — Transport (`/hostel-transport/...`)

### 8. Transport Overview
- Today's run status per route (pickup/drop-off completion).

### 9. Routes & Stops (`/hostel-transport/routes`)
- Route list with stop builder (ordered stop list per route).

### 10. Student-Route Assignment (`/hostel-transport/route-assignment`)
- Student picker → route + stop assignment.

### 11. Driver/Conductor Records (`/hostel-transport/drivers`)
- Simple directory with license/verification status.

### 12. Pickup/Drop Attendance (`/hostel-transport/pickup-attendance`)
- Mobile-first per-route checklist (board/no-board toggle per student), designed to be usable one-handed on a phone during an actual bus run — this is the single most mobile-critical screen in this whole stage, test it at 375px specifically.

### 13. Vehicle Maintenance (`/hostel-transport/maintenance`)
- Log + due-for-service alerts (badge on any vehicle approaching its `nextServiceDueDate`).

**Done when**: every Hostel & Transport nav item resolves to a real page, an unapproved evening-roll-call absence visibly and immediately flags on screen (not just in a backend notification log), and the pickup-attendance screen is genuinely usable on an actual 375px-wide phone, not just a resized browser window.
