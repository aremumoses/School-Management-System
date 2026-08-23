# Stage 19 — Frontend Prompt (Resources / Digital E-Library)

> Copy everything below the line into Claude Code as one message. Assumes this stage's backend prompt is done.

---

Follow `prompts/00-DESIGN-SYSTEM.md` throughout.

## 1. Teacher Resources (`/teacher/resources`)
- A list of the teacher's own uploads (title, subject, type icon, class scope) with an upload form (file or link, subject/topic, class/arm picker — multi-select if a resource applies to more than one arm at a level).

## 2. Student E-Library (`/student/library`)
- A browsable catalog (filter by subject, topic, type) of resources scoped to the student's own class, card-grid layout (title, type icon, subject/topic chip, open/download action). Search box filtering by title/topic.
- If Stage 24 (physical Library module) hasn't shipped yet, don't add a "physical books" section or tab — that's explicitly out of scope for this stage; revisit this page once Stage 24 exists if the two need to merge into one E-Library + Catalog screen.

**Done when**: a teacher's uploaded note and video link both appear correctly in the student's `/student/library` view for the right class, filterable by subject, and a student outside that class sees neither.
