# Parent / Guardian Dashboard

## Who uses this

**Parents and guardians**, often juggling multiple children in different classes. This is one of the two most business-critical dashboards (alongside School Admin) because parent satisfaction and fee payment both flow through it — and it must work well on low-end phones and patchy data connections, which is why several Nigeria-specific fallbacks exist here (see §10).

## Purpose

Give parents a single, trustworthy window into their child's school life — attendance, performance, fees, and communication — replacing scattered WhatsApp groups and guesswork.

## Key Capabilities

### 1. Multi-Child Dashboard
- One login surfaces **all** of a guardian's children/wards at the school, with quick switching between children.

### 2. Real-Time Attendance Alerts
- Get notified (push/SMS) when a child is marked absent or late.

### 3. Fee Payment & History
- View current fee balance and breakdown (tuition, levies, transport, etc.) per child per term.
- Pay online via Paystack/Flutterwave (card, bank transfer, USSD via gateway).
- View payment history and download receipts.
- Set up or follow an installment plan if the school offers one.

### 4. Report Cards & Performance
- View and download published report cards.
- See a performance trend chart per child across terms/sessions (is this child improving or slipping, subject by subject).

### 5. Communication
- Receive school/class broadcasts (notices, event invites, emergency closures).
- Message a child's teacher directly (moderated/logged).
- Choose preferred channel per notification type where possible (push, SMS, email, WhatsApp).

### 6. Consent & Permission Slips
- E-sign consent forms (excursions, medical treatment authorization, photo/video consent) — replaces paper slips that get lost in school bags.

### 7. Events & Calendar
- View the school calendar; RSVP to events (PTA meeting, sports day, prize-giving day).

### 8. PTA Dues & Levies
- Pay PTA dues and one-off levies through the same payment flow as school fees.

### 9. Transport (if applicable)
- View the child's assigned bus route and pickup/drop times.
- (Phase 3) Live bus location tracking.

### 10. Pickup Authorization
- Manage the list of people authorized to pick up the child, used by Front Desk/Security for verification (see [Front Desk / Security Dashboard](13-dashboard-front-desk-security.md)).

### 11. Homework Tracking
- See assignments given to each child and whether they've been submitted/graded — useful for parents who want to support homework completion at home.

### 12. Low-Connectivity / Low-Smartphone-Access Fallbacks
- **SMS-first notifications** for parents without a smartphone or reliable data — critical fee, attendance, and result-ready alerts always have an SMS fallback, not just an in-app push.
- **WhatsApp Business API** channel as an alternative to the native app, since most Nigerian parents already use WhatsApp daily.
- (Phase 3) **USSD short-code** menu (e.g., dial a code) to check attendance, fee balance, and result summary from any phone, no internet required — see [Communication Module](16-module-communication.md) and [19-unique-differentiators.md](19-unique-differentiators.md).

## Screens

- Home (per-child summary cards: attendance today, fee balance, latest notice)
- Child switcher
- Attendance
- Fees & Payments
- Report Cards & Performance Trends
- Messages
- Notices/Calendar & Event RSVP
- Consent Forms
- Transport
- Pickup Authorization
- Homework Tracker

## Sample Workflows

**Paying school fees**: Parent opens Fees & Payments for a child → sees the term invoice breakdown → pays via Paystack → receives an instant receipt and an SMS confirmation → balance updates immediately, visible to the Bursar too.

**Handling an absence alert**: Child is marked absent by the Class Teacher → parent receives an SMS + push notification within minutes → parent can reply via the in-app message to inform the teacher of the reason, logged against the attendance record.

## Notifications received
- Attendance (absence/lateness).
- Fee invoice issued / payment due reminder (escalating: in-app → SMS → WhatsApp as due date nears, see [Communication Module](16-module-communication.md)).
- Report card published.
- New message from a teacher/school.
- Event invitations.
- Disciplinary notice, if applicable.

## Data exports
- Payment receipts (PDF)
- Child's report card (PDF)
