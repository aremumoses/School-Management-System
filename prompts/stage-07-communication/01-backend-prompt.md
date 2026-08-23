# Stage 7 — Backend Prompt (Communication)

> Copy everything below the line into Claude Code as one message. Assumes Stages 1–6 are complete — this stage wires real sends into the stub events from Stage 4 (absence) and Stage 6 (fee reminders).

---

Read **`docs/16-module-communication.md` in full** before starting.

## 1. Provider services
- `SmsService` wrapping Termii's REST API (plain `axios`/`fetch` calls, no SDK needed) — a single method like `send(to: string, message: string)` so the provider can be swapped later without touching callers (§ "design behind a provider-agnostic interface" per `docs/18-technical-architecture.md` §10).
- `EmailService` wrapping Resend.
- Both read their API keys from env vars, never hardcoded, and both log delivery attempts (success/failure) for the delivery-tracking feature below.

## 2. `CommunicationModule`
- `Notice` CRUD (the notice board, §9).
- `POST /broadcast` — `{ targetType: 'CLASS'|'ROLE'|'INDIVIDUAL'|'WHOLE_SCHOOL', targetId?, channels: ['SMS','EMAIL','PUSH'], templateId? | message }` — resolves the target into actual recipients, sends via the requested channels, and records a `BroadcastLog` (who sent it, to how many, per-recipient delivery status) for the read-receipt feature in §7. Guard per `docs/03-roles-and-permissions.md` §2 ("Communication/broadcast" row — scoped by role, e.g. a Subject Teacher can only target their own class).
- `MessageTemplate` CRUD (§4) with placeholder substitution (`{{student_name}}`, `{{balance}}`, `{{due_date}}`).
- Two-way messaging: `Conversation` + `Message` models for teacher↔parent threads (§6), with `POST /conversations/:id/messages`.

## 3. Wire the real sends
- Subscribe to Stage 4's absence event → send an SMS (and push, once §5 of the frontend exists) to the student's guardian(s) using the absence-alert template.
- Build the **escalating fee-reminder** job (§5): a `@nestjs/schedule` cron task that runs daily, finds invoices crossing each escalation threshold (T-7/T-3/due-date/T+3 from `docs/19-unique-differentiators.md` §6), and sends the appropriately-channeled reminder — don't re-send the same threshold twice for the same invoice (track which thresholds have already fired).

## 4. Delivery tracking
- Expose `GET /broadcast/:id/delivery-status` returning sent/delivered/read counts per channel where the channel supports it (SMS delivery receipts if Termii provides them; in-app read timestamp for notices).

**Done when**: marking a seeded student absent (Stage 4's endpoint) results in a real SMS arriving on a real test phone number via Termii; a manually-triggered run of the fee-reminder cron job correctly identifies and messages only the invoices that just crossed a threshold (not ones already reminded); and a broadcast sent to "Class JSS1 Gold" only reaches that class's guardians, verified against the seed data.
