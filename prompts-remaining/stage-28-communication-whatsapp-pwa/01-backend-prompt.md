# Stage 28 — Backend Prompt (WhatsApp, Push, USSD)

> Copy everything below the line into Claude Code as one message. Assumes Stages 1–9 and 11 are complete. Closes `docs/22-implementation-status.md`'s WhatsApp/USSD differentiator row. WhatsApp + Push are Phase 2; USSD is explicitly Phase 3 per `docs/20-roadmap-phases.md` — build it last in this stage, and treat it as the most skippable piece if time is short.

---

Read `docs/16-module-communication.md` §1, §6, §8 before starting. Read `api/src/modules/communication/broadcasts.service.ts` in full first — every channel this stage adds slots into the existing `NotificationChannel` enum and `fanOut`/`createSystemBroadcastLog` machinery, it doesn't replace it.

## 1. WhatsApp Business API channel
- Add `WHATSAPP` to `NotificationChannel`. Build a `WhatsAppProviderService` (same shape as the existing `sms.service.ts`/`email.service.ts` — a thin REST wrapper, not a heavy SDK) against whichever BSP the school has (Termii's WhatsApp product or 360dialog — pick one, document the env vars needed in `RUNBOOK.md` per Stage 11's convention). Wire it into `fanOut()`'s existing channel-dispatch switch.
- Update the channel-routing defaults documented in `docs/16-module-communication.md` §2 and already partially implemented in `FeeRemindersService`'s `THRESHOLD_CONFIG` (Stage 7) — its code comment explicitly notes EMAIL was substituting for WhatsApp "since no WhatsApp BSP is wired up" — **remove that substitution now that one is**, restoring the spec's actual due-date/T+3 WhatsApp+SMS combination.
- Two-way messaging (§6): a webhook endpoint receiving inbound WhatsApp messages, routing them into the existing `Conversation`/`Message` model as a reply (matched by the sender's registered phone number to a Guardian/Staff record) — so a teacher only ever has to check the in-app thread, never a separate WhatsApp inbox, per the spec's explicit framing.

## 2. Push notifications (PWA)
- A `PushSubscription` model (userId, userType, subscription JSON — the standard Web Push subscription object). `POST /push/subscribe`, `DELETE /push/subscribe`. Add `PUSH` as a real channel in `fanOut()` using `web-push` (VAPID keys, generate and store server-side only) — this is the backend half; Stage 28's frontend prompt handles requesting permission and registering the subscription.

## 3. USSD fallback (Phase 3 — build last, most skippable)
- A `UssdSessionController` implementing whatever menu protocol the chosen Nigerian USSD aggregator expects (Africa's Talking and most Nigerian telco aggregators use a simple stateless request/response per menu step — there's no one universal "the" Nigerian USSD API, so this needs an aggregator account before it can be tested for real; build the menu logic against a documented interface and note in a comment which aggregator it's modeled on).
- Menu: "1. Check attendance, 2. Check fee balance, 3. Check latest result summary" — authenticated by the registered phone number on file plus a PIN (add a `ussdPin` field to `Guardian`, hashed the same way passwords are). Each menu option calls the existing read endpoints (attendance summary, invoice balance, latest published result) — no new business logic, just a USSD-shaped front door onto data that already exists.

**Done when**: a WhatsApp message sent through the broadcast pipeline is confirmed delivered (test account), a reply to it correctly appears in the matching in-app conversation thread, a push notification is received on a real installed-PWA device, and (if a USSD aggregator account is available to test against) dialing the configured short code successfully returns a real fee balance for a registered parent's phone number.
