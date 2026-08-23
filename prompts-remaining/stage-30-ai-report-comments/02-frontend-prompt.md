# Stage 30 — Frontend Prompt (AI-Assisted Report Card Comments)

> Copy everything below the line into Claude Code as one message. Assumes this stage's backend prompt is done.

---

Follow `prompts/00-DESIGN-SYSTEM.md` throughout.

## 1. Comment field suggestion UI
- Wherever the form-teacher comment and principal's comment are currently entered (the existing Stage 5 result-approval screens — `/teacher/class-ratings` for the form comment, `/admin/results` for the principal's comment), add a "Suggest a comment" button next to the textarea. Clicking it calls this stage's backend endpoint, shows a loading state (this is a real LLM call, expect a couple of seconds — don't let the UI look frozen), then **populates the textarea with the suggestion as editable text the teacher must still explicitly save** — never auto-saves on suggestion, and make that visually obvious (e.g. the textarea border or a small "Draft — not yet saved" label until the existing Save action is actually clicked).
- If the suggestion call fails or rate-limits, fail quietly back to the normal manual-entry experience (a toast, not a blocking error) — this is an assistive feature, its absence should never block a teacher from writing a comment the old-fashioned way.

**Done when**: clicking "Suggest a comment" for a real student populates an editable draft grounded in that student's actual term data, the teacher can edit it freely before saving, and nothing is written to the student's actual report card until the existing Save button is explicitly clicked — verified by suggesting a comment, refreshing the page without saving, and confirming the draft is gone (proving it was never persisted).
