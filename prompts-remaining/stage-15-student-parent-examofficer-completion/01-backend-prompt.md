# Stage 15 — Backend Prompt (Student messaging extension)

> Copy everything below the line into Claude Code as one message. Assumes Stages 1–9 and 11 are complete. This stage is almost entirely frontend (see `02-frontend-prompt.md`) — this backend prompt is intentionally small, covering the one real gap: `docs/22-implementation-status.md` §3 notes `conversations.controller.ts` explicitly excludes STUDENT from messaging, while `docs/06-dashboard-student.md` asks for student↔own-teacher messaging too.

---

Read `docs/06-dashboard-student.md`'s Messages line and `docs/16-module-communication.md` §6 before starting. Read `api/src/modules/communication/conversations.service.ts` and `conversations.controller.ts` in full first — understand exactly how the existing staff↔guardian scoping works before extending it, since this needs to reuse that pattern, not duplicate it.

## 1. Extend `ConversationsModule` to include `STUDENT`
- Add `STUDENT` to whatever role list currently gates conversation creation/access (`conversations.controller.ts`). A student may only start or participate in a conversation with **their own subject/class teacher(s)** — reuse `ClassScopeService`'s existing own-class-scope check (the same one `IncidentsService`/`BroadcastsService` already use), don't write a second scoping implementation.
- Confirm moderation settings (per `docs/16-module-communication.md` §6 — "schools can configure whether parent-to-teacher messaging is open or must be approved/visible to an Admin") extend correctly to student-initiated threads too, if that setting already exists from Stage 7; if it doesn't exist yet, don't add it now — out of scope for this stage.

**Done when**: a Student can start a new conversation with one of their own subject teachers, the teacher can reply, and a Student attempting to message a teacher who doesn't teach them is rejected with a 403 — covered by an e2e test the same way Stage 7's guardian-side scoping was tested.
