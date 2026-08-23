# Stage 29 — Frontend Prompt (Digital ID/QR gate-scan, Early-Warning At-Risk Flagging)

> Copy everything below the line into Claude Code as one message. Assumes this stage's backend prompt is done.

---

Follow `prompts/00-DESIGN-SYSTEM.md` throughout.

## 1. Student Digital ID card
- A printable/displayable ID card view (`/admin/students/[id]` — add an "ID Card" tab or action, and a self-view at `/student/profile` since the student/parent should be able to pull up their own QR if asked at the gate) rendering the student's photo, name, admission number, class, and a QR code encoding their `qrToken` (a lightweight client-side QR library — check if one's already a dependency before adding a new one; if not, a small well-maintained one like `qrcode` is reasonable, don't pull in anything heavy per design system §9's lean-bundle rule).

## 2. Front Desk QR scanner (`/front-desk/pickup-verification`, extending Stage 21's screen)
- Add a "Scan QR" entry point alongside the existing manual name/phone entry — a device-camera QR reader (a small, focused library, same bundle-size discipline as §1) that calls `GET /students/qr/:qrToken` on a successful scan and immediately shows the resolved student + their authorized pickup list, feeding into the same match/escalate flow Stage 21 already built. This is additive to that screen, not a replacement — keep the manual-entry path working for when a phone camera isn't available or the QR is damaged/missing.

## 3. At-Risk Students view
- `/teacher/gradebook` (extending Stage 18's screen) and a small widget on `/admin` (extending Stage 13's home): a flagged-students list (name, reason — attendance/CA/both, flagged date), using the `warning`/`error` badge convention consistently with every other risk/status indicator already in this build.

**Done when**: a real student ID card's QR code, scanned with an actual phone camera at the front-desk screen, correctly resolves to that student's pickup-authorization list end-to-end, and a deliberately at-risk seeded student visibly appears in the Class Teacher's gradebook flag list with the correct reason shown.
