# Module — Academics & Results Engine

This is the core engine that several dashboards plug into: **Teachers** enter scores, **Class Teachers** add conduct ratings, **Exam Officers** collate and rank, **School Admins** approve and publish, and **Students/Parents** consume the result. This doc specifies the engine itself so it's built once and reused everywhere, rather than re-implemented per dashboard.

## 1. Academic Structure

- **Session** → **Term** (3 per session: First, Second, Third) → **Class** (JSS1–SSS3) → **Arm/Section** (e.g., Gold, Silver, A, B) → **Subject**.
- **Subject combinations** at SSS level (Science / Arts / Commercial, or a school's own tracks) restrict which subjects a student is registered for, and therefore which subjects they're scored on and which appear on their report card.
- Each student belongs to exactly one class+arm per term/session, with a documented history across sessions (promotion/repeat/transfer) — see §6.

## 2. Configurable Assessment Structure

Nigerian private schools vary in their internal CA policy, so this must be **configurable per school** (with sensible defaults), not hardcoded:

- Default example: **CA1 (10%) + CA2 (10%) + CA3 (10%) + Examination (70%)** — common in many Lagos private secondary schools.
- Alternative example: **CA (40% total) + Examination (60%)**, the split WAEC/NERDC continuous assessment guidance is often summarized as.
- The school sets:
  - Number of CA components per term and their max scores/weights (must sum to a configurable total, typically 100%).
  - Whether weights differ by subject (e.g., practical-based subjects might weight a project component higher).
- This configuration lives at the school level with an optional override per subject if needed.

## 3. Score Entry & Locking

- Subject Teachers enter scores into a grid per class/subject/assessment component, validated against each component's max score.
- **Total score** and **provisional grade** are computed live as a preview, before submission.
- On **Submit**, the row locks for that teacher. Unlocking requires an Exam Officer/Admin action, which is recorded in the audit log with a reason (see [18-technical-architecture.md](18-technical-architecture.md) §8).
- A **deadline** per class/subject drives automatic lock and a countdown visible to teachers (see [Teacher Dashboard](05-dashboard-teacher.md)).

## 4. Grading Scale

Configurable per school, with a default that mirrors the familiar **WAEC-style scale**:

| Score range | Grade | Remark |
|---|---|---|
| 75–100 | A1 | Excellent |
| 70–74 | B2 | Very Good |
| 65–69 | B3 | Good |
| 60–64 | C4 | Credit |
| 55–59 | C5 | Credit |
| 50–54 | C6 | Credit |
| 45–49 | D7 | Pass |
| 40–44 | E8 | Pass |
| 0–39 | F9 | Fail |

Schools that prefer a simpler **A–F** scale (e.g., A=80-100, B=70-79, C=60-69, D=50-59, F=<50) can configure that instead. The grading table is a per-school setting, not a constant.

## 5. Ranking & Computation

- **Position in Subject**: rank of a student's subject score against all classmates taking that subject, computed automatically once all scores for that subject/class are submitted.
- **Position in Class** (overall): rank by total/average aggregate score across all registered subjects, computed once **all** subjects for that class are submitted and locked.
- **Class average** per subject is shown alongside each student's score on the report card and broadsheet, for context.
- Ties are handled with a configurable tie-breaking rule (e.g., shared rank, or next-decimal average as tiebreaker) — default: shared rank (e.g., two students both "3rd").

## 6. Report Card Layout (Nigerian Standard)

The report card is the single most important generated document in the system. Layout fields:

- School header: logo, name, address, motto, registration number.
- Student bio: name, admission number, class/arm, term, session, photo.
- **Per-subject table**: Subject | CA1 | CA2 | CA3 | Exam | Total | Grade | Position in Subject | Class Average | Remark.
- **Summary row**: total obtainable, total scored, average %, **overall position in class**, number of students in class.
- **Attendance summary** for the term: days present / days absent / total school days.
- **Affective Domain ratings** (typically rated on a scale, e.g., 1–5 or Excellent/Good/Fair/Poor): Punctuality, Neatness, Honesty, Relationship with peers, Relationship with staff, Leadership, Initiative.
- **Psychomotor Domain ratings**: Handwriting, Sports/Games, Handling of tools/instruments, Musical skill, Verbal fluency — adaptable per school, often more relevant at junior secondary.
- **Form Teacher's comment** (free text, written by the Class Teacher, may be AI-assisted per [19-unique-differentiators.md](19-unique-differentiators.md)).
- **Principal's comment** (free text, written/approved by the School Admin).
- Next term's resumption date.
- Fee status indicator (optional, school-configurable — some schools choose to withhold report cards until balance is cleared).

Generated as a polished, printable **PDF** (see [18-technical-architecture.md](18-technical-architecture.md) §6 for the PDF generation approach), matching what Nigerian parents expect a school report card to look like, not a generic table export.

## 7. Approval & Publishing Workflow

```
Subject Teacher enters & submits scores
        ↓
Class Teacher adds affective/psychomotor ratings + form comment
        ↓
Exam Officer collates broadsheet, verifies positions/grades
        ↓
School Admin (Principal) reviews + adds principal's comment → Approve / Return
        ↓
Publish → report cards visible to Student/Parent + notification sent
```

Each step is logged (who, when) so a delayed or disputed result can always be traced back to where it stalled.

## 8. Promotion Logic

- At session rollover, the system can **auto-suggest promotion** based on a configurable threshold (e.g., overall average ≥ 40% and no more than N failed core subjects) — Admin reviews and confirms before it's final, never fully automatic without human sign-off.
- Outcomes per student: **Promoted**, **Repeated**, **Transferred out**, **Withdrawn**, **Graduated** (SSS3 → alumni).
- A student's full academic history (class/arm per session, with outcome) is retained permanently for transcript generation.

## 9. Performance Trend & Transcript

- Term-on-term and session-on-session score trend per subject per student, visualized as a simple line/bar chart on [Student](06-dashboard-student.md) and [Parent](07-dashboard-parent.md) dashboards.
- A **transcript** document aggregates results across multiple sessions for a single student — used for school transfers, scholarship applications, or post-graduation reference.

## 10. AI-Assisted Comments (Phase 3, human-in-the-loop)

- When a Class Teacher or Principal opens the comment field, the system can suggest a draft comment based on the student's score trend, attendance, and conduct ratings for the term.
- The suggestion is always **editable and must be explicitly accepted** before saving — never auto-published without a human reviewing it. See [19-unique-differentiators.md](19-unique-differentiators.md).
