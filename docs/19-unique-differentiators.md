# 19 — Unique Differentiators

The base feature set in [02-feature-list.md](02-feature-list.md) gets the System to "competitive with existing Nigerian school software." This document is what makes it genuinely **better** — features chosen because they solve a real, specific pain point in the Lagos/Nigerian secondary-school context, not generic "AI-powered" dressing.

## 1. WhatsApp-First, USSD-Fallback Communication

**The problem**: most school apps assume every parent has a smartphone, data, and the habit of opening a native app. In Lagos, many parents — especially in public and lower-fee private schools — primarily use WhatsApp, and a meaningful number don't have reliable smartphone data access at all.

**The feature**: WhatsApp Business API as a first-class channel (not an afterthought), plus a USSD short-code fallback (Phase 3) so a parent can dial a code from any phone to check attendance, fee balance, or result summary without needing data at all. See [Communication Module](16-module-communication.md) §1, §8.

## 2. Offline-First Classroom Data Entry

**The problem**: school Wi-Fi/data in many Nigerian classrooms is inconsistent. A teacher trying to mark attendance or enter CA scores mid-lesson shouldn't lose work or be blocked because the connection dropped.

**The feature**: attendance and score entry queue locally and sync automatically once connectivity returns, via a local-first PWA pattern. See [18-technical-architecture.md](18-technical-architecture.md) §7.

## 3. Built-In CBT Engine with JAMB-Style Practice

**The problem**: WAEC, NECO, and especially **JAMB UTME** are all moving toward or already are CBT-based, but most SSS3 students' only exposure to a computer-based exam interface is the real one on exam day — high anxiety, unfamiliar UI, avoidable mistakes.

**The feature**: a CBT engine the school can use for internal exams (with real anti-cheating measures), plus a dedicated **JAMB UTME mock-practice mode** so students build familiarity with timed, full-screen CBT before it counts. See [CBT & Examination Engine](17-module-cbt-examination.md) §7.

## 4. AI-Assisted Report Card Comments (Human-in-the-Loop)

**The problem**: writing 30–40 individual, meaningful comments per class per term is one of the most tedious parts of a teacher's job, and it shows — many report cards end up with generic, copy-pasted remarks.

**The feature**: when a Class Teacher or Principal opens the comment field, the system drafts a suggestion grounded in that specific student's score trend, attendance, and conduct ratings for the term. The teacher must read, edit, and explicitly approve it — it's a drafting aid, never an auto-publish. This keeps comments meaningful without the time cost. See [Academics & Results Module](14-module-academic-results.md) §10.

## 5. Early-Warning At-Risk Student Flagging

**The problem**: a student's slide from "doing fine" to "failing" is usually visible in attendance and CA trend data weeks before the term-end report card delivers the bad news to parents — but nobody is watching that trend in real time.

**The feature**: a background analysis flags students whose attendance or running CA average drops past a configurable threshold mid-term, surfaced to the Class Teacher and Admin (and optionally the parent) **before** the final report card, giving time to intervene.

## 6. Smart, Escalating Fee Reminders

**The problem**: the bursar currently chases defaulters manually and uniformly — same message, same channel, regardless of how close to due date or how large the balance.

**The feature**: a configurable escalation sequence (in-app → SMS → WhatsApp, intensifying as the due date passes) that does the early chasing automatically, so the Bursar's personal follow-up time is spent only on genuine holdouts. See [Communication Module](16-module-communication.md) §5.

## 7. Affective & Psychomotor Ratings Built In, Not Bolted On

**The problem**: the affective/psychomotor domain section of a Nigerian secondary report card (punctuality, neatness, leadership, handling of tools, etc.) is a standard expectation that most generic/foreign school-software products don't model at all, forcing schools to keep a separate paper form just for that section.

**The feature**: these ratings are a native part of the report card data model from day one, entered by the Class Teacher alongside everything else. See [Academics & Results Module](14-module-academic-results.md) §6.

## 8. Digital ID with Gate-Scan Verification

**The problem**: school security at the gate is usually based on recognition, not verification — a real gap, especially where front-desk staff can't know every parent/guardian/sibling by sight.

**The feature**: QR-coded digital student ID, scannable at the gate, cross-checked against the authorized-pickup list maintained by the parent. See [Front Desk / Security Dashboard](13-dashboard-front-desk-security.md) §3 and [Student Information Management](02-feature-list.md) §3.

## 9. One-Click External Exam Body Data Export

**The problem**: registering candidates for BECE/WAEC/NECO and assembling the continuous-assessment data they require is a manual, error-prone, once-a-year scramble for the Exam Officer.

**The feature**: candidate registration tracking with subject combinations, kept current all session (not assembled from scratch at deadline time), with export in the format needed. See [Exam Officer Dashboard](09-dashboard-exam-officer.md) §8.

## 10. Bulk Migration Tooling

**The problem**: the school's first day on any new system is the highest-friction day — if onboarding existing student/staff records is painful, adoption stalls before it starts.

**The feature**: Excel-template bulk import for students, staff, and historical scores, designed around how the school's existing Excel sheets actually look (not a generic CSV schema someone has to reformat by hand). See [02-feature-list.md](02-feature-list.md) §2–4.

## Prioritization note

Most of the items above are tagged **(P3)** in [02-feature-list.md](02-feature-list.md) — they are differentiators layered on top of a solid core, not reasons to delay shipping the core. See [20-roadmap-phases.md](20-roadmap-phases.md) for sequencing. The two differentiators worth pulling earlier if resources allow are **#6 (escalating fee reminders)** and **#7 (affective/psychomotor ratings)** — both are cheap to build relative to the trust and adoption they buy.
