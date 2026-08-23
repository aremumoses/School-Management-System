# Module — Communication Engine

Used by every staff dashboard to broadcast or message, and consumed by [Student](06-dashboard-student.md) and [Parent](07-dashboard-parent.md) dashboards. Built around one hard constraint of the Nigerian market: **not every parent has a smartphone or reliable data**, so the engine must never assume in-app push is enough on its own.

## 1. Channels

| Channel | Use case | Notes |
|---|---|---|
| **In-app notification** | Default for any logged-in user | Free, instant, but only reaches users who open the app |
| **SMS** | Critical alerts: attendance, fee due, result ready | Via a Nigerian SMS gateway (Termii, Africa's Talking, KudiSMS, BulkSMSNigeria); works on any phone, no data required |
| **Email** | Formal communication, receipts, longer-form notices | Via Resend/SendGrid/Postmark |
| **WhatsApp Business API** | General broadcast & two-way messaging | Most Nigerian parents already use WhatsApp daily — high open rate vs a native app they rarely open |
| **Push (PWA)** | Re-engagement for users with the app installed | Free, but requires the PWA to be installed and notification permission granted |
| **USSD** (Phase 3) | Fallback for parents with no smartphone/data at all | Dial a short code to check attendance/fee balance/result summary via menu prompts |

## 2. Message Types & Default Channel Routing

- **Attendance alert (absence/lateness)** → Push + SMS (immediate, time-sensitive).
- **Fee invoice issued** → In-app + Email.
- **Fee reminder, escalating as due date nears** → In-app first → SMS a few days before due → WhatsApp/SMS again on/after the due date (see §5).
- **Report card published** → In-app + Push + SMS ("Your child's report card is ready, log in to view").
- **General notice/event** → In-app + WhatsApp/Email broadcast.
- **Disciplinary notice** → In-app + SMS + direct message, treated as high-priority.
- **Emergency/closure notice** → All channels at once, no escalation delay.

Default routing is configurable per school and per message type — some schools will prefer to lean more heavily on WhatsApp than SMS, for cost reasons (SMS costs the school per message; WhatsApp Business API has its own pricing but a different cost curve).

## 3. Targeting

- **Whole school**, **specific class/arm**, **specific subject's students**, **individual student/parent/staff**, **all staff**, **all parents**, **specific role** (e.g., all Class Teachers).
- Targeting is enforced the same way permissions are — a Subject Teacher can only target their own class/subject, while the Admin can target anyone in the school.

## 4. Templates

- Predefined templates for common messages (fee reminder, absence alert, result-ready, event invite) with placeholders (`{{student_name}}`, `{{balance}}`, `{{due_date}}`) filled in automatically per recipient.
- The school can customize template wording to match its own voice.

## 5. Smart Fee Reminder Escalation (differentiator)

A configurable escalation sequence rather than a single reminder:
1. **T-7 days**: in-app notice only.
2. **T-3 days**: SMS + in-app.
3. **Due date**: WhatsApp + SMS.
4. **T+3 days overdue**: WhatsApp + SMS, CC'd to a second guardian if one is on file, and surfaced on the Bursar's defaulter list for personal follow-up.

This reduces the Bursar's manual chasing workload while staying firm without being relentless on day one.

## 6. Two-Way Messaging

- Parents/students can reply to a teacher's message; replies are logged against the conversation thread (not anonymous, not open broadcast).
- WhatsApp two-way messages route through the WhatsApp Business API back into the same in-app conversation thread, so a teacher doesn't need to separately monitor WhatsApp.
- Moderation: schools can configure whether parent-to-teacher messaging is open or must be approved/visible to an Admin (useful for schools wanting oversight of all parent-staff communication).

## 7. Delivery Tracking

- Per-message delivery/read status (sent, delivered, read where the channel supports it — SMS delivery receipts, WhatsApp read receipts, in-app read timestamps).
- Bursar/Admin can see "this reminder was delivered to 240 of 250 parents" to judge whether a channel is working.

## 8. USSD Fallback (Phase 3)

- A registered short code (e.g., `*XXX#`) lets any parent, from any phone, dial in and navigate a menu: "1. Check attendance, 2. Check fee balance, 3. Check latest result summary" — authenticated via the registered phone number on file plus a PIN.
- Critical for reaching parents who can't be reached any other way, and a genuine differentiator versus most existing Nigerian school software, which assumes app/smartphone access.

## 9. Notice Board

- A simple persistent feed of all notices (separate from time-sensitive alerts), browsable by date/category, visible on Student/Parent/Staff dashboards as a "Notices" tab.
