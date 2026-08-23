# Stage 28 — Frontend Prompt (Offline-first PWA & Push)

> Copy everything below the line into Claude Code as one message. Assumes this stage's backend prompt is done (for the push-subscription endpoints).

---

Follow `prompts/00-DESIGN-SYSTEM.md` throughout. Read `docs/18-technical-architecture.md` §7 before starting.

## 1. Service worker & installability depth
- The manifest (`app/manifest.ts`) and basic installability already exist from earlier stages — this stage adds the actual service worker (Workbox or Next's PWA plugin, whichever integrates more cleanly with the current Next.js version in use — check `package.json` before assuming a specific plugin's compatibility) caching the app shell so the dashboard loads (even to a "you're offline" state, not a blank white screen) without a network connection.

## 2. Offline-first data entry for Attendance and Score Entry
- Per `docs/18-technical-architecture.md` §7: queue writes locally (IndexedDB via Dexie.js, per the doc's own suggested library — keep using it unless there's a strong reason not to, no need to evaluate alternatives) when `navigator.onLine` is false or a request fails with a network error, instead of just showing an error toast. Show a clear "queued, will sync" indicator distinct from "saved" (don't let a teacher believe attendance was recorded when it's actually sitting in a local queue). Register a background sync (or a simple "retry on reconnect" `online` event listener if the Background Sync API isn't reliably available on the target browsers — confirm support before depending on it) that flushes the queue to the real `POST /attendance/mark` / `POST /scores/submit` endpoints once connectivity returns.
- Scope this to exactly the two screens the architecture doc names — `/teacher/attendance` and `/teacher/scores` — don't expand offline support to every screen in the app; that's explicitly out of scope and would be a much larger undertaking than asked for.

## 3. Push notifications
- A notification-permission prompt (contextual — ask after a meaningful first action, not on page load, per standard PWA UX practice) that, on accept, registers a Web Push subscription against this stage's new `POST /push/subscribe` endpoint. Confirm a real push notification (e.g. triggered by marking a student absent, reusing the existing absence-alert path now routed through the PUSH channel too) is received on an actual installed PWA on a real Android device — a desktop browser's notification permission prompt is not sufficient verification for this feature, the whole point is the installed-app experience.

**Done when**: marking attendance while deliberately offline (airplane mode on a real device) queues the write with a visible "queued" state, and it correctly syncs once connectivity returns, with no duplicate submissions if the form is submitted twice while still offline; a push notification is confirmed received on a real installed PWA.
