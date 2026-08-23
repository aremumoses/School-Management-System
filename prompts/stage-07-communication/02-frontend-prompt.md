# Stage 7 — Frontend Prompt (Notices, broadcast composer, messaging)

> Copy everything below the line into Claude Code as one message. Assumes Stage 7's backend endpoints already exist.

---

Read `docs/16-module-communication.md` §3–7, and follow `prompts/00-DESIGN-SYSTEM.md` throughout.

## 1. Notification bell (shared component, used in every dashboard's top bar)
- A bell icon with an unread-count badge (per `00-DESIGN-SYSTEM.md` §2/§6 — `accent` color dot). Clicking opens a dropdown/panel listing recent notices and messages, each with a relative timestamp, unread items visually distinct (subtle background tint, not just bold text). This single component gets reused across every dashboard built so far — build it once, well, here.

## 2. Notice board (`/[role]/notices`)
- A simple feed, newest first, each notice as a card (title, short preview, date, a category tag). Detail view on click. Available to every role's dashboard.

## 3. Admin/Staff: broadcast composer (`/admin/broadcast`, also reachable from relevant staff dashboards per their scope)
- Target picker (whole school / class / role / individual — scoped to what the logged-in user is allowed to target), channel picker (checkboxes: in-app, SMS, email — show an estimated recipient count and, if available, an approximate SMS cost note), an optional template picker that pre-fills the message with a live preview showing placeholders already substituted for a sample recipient, and a "Send" button with a confirmation step showing exactly who will receive it before it goes out (broadcasts aren't easily undoable — the confirmation should feel deliberate, not throwaway).
- After sending, show the delivery-status view (sent/delivered/read counts) so the sender gets feedback that it actually worked.

## 4. Messaging (`/[role]/messages`)
- A standard two-pane thread UI (conversation list + active thread) — familiar messaging-app pattern, mobile-first (full-screen thread view on mobile with a back button, two-pane only above `md`). New message composer limited to who that role is allowed to message (Teacher ↔ their own students' parents, etc.).

**Done when**: a broadcast sent to a specific class is visible as a notice to that class's parents only, the notification bell correctly shows an unread badge that clears on opening, and a teacher and a parent can exchange messages in a thread that both can see and that persists on reload — all checked on a mobile viewport for the messaging UI specifically, since that's the screen most likely to be used on a phone, mid-conversation.
