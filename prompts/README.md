# Build Prompts

This folder contains the actual, ready-to-paste prompts for building the School Management System described in [`../docs`](../docs/00-INDEX.md), stage by stage. Where `docs/21-build-guide.md` *explains* the plan, this folder *is* the plan, in literal prompt form.

## How to use this folder

1. Work through the stage folders **in numeric order** (`stage-00-...` → `stage-10-...`). Each stage depends on the previous one.
2. **Within each stage, run the backend prompt first, then the frontend prompt** — the frontend prompt assumes the backend's endpoints already exist and work, so it can build real screens against them instead of guessing at shapes.
3. Open the prompt file, copy everything below the `---` divider, and paste it as one message to Claude Code. Each prompt is self-contained (it tells Claude Code which `docs/*.md` files to read for the full spec), so it works even in a fresh session.
4. After each prompt finishes, **run the app and check the "Done when" line at the bottom of that prompt** before moving to the next one. Don't stack unverified stages.
5. Commit after each stage.

## Folder map

| Stage | Folder | Backend? | Frontend? |
|---|---|---|---|
| 0 | `stage-00-project-setup/` | ✅ | ✅ |
| 1 | `stage-01-auth-rbac-data-model/` | ✅ | ✅ |
| 2 | `stage-02-school-academic-setup/` | ✅ | ✅ |
| 3 | `stage-03-student-information-management/` | ✅ | ✅ |
| 4 | `stage-04-attendance/` | ✅ | ✅ |
| 5 | `stage-05-academics-results-engine/` | ✅ | ✅ |
| 6 | `stage-06-fees-payments/` | ✅ | ✅ |
| 7 | `stage-07-communication/` | ✅ | ✅ |
| 8 | `stage-08-parent-student-dashboard-polish/` | — | ✅ (frontend-only stage) |
| 9 | `stage-09-discipline-calendar-documents/` | ✅ | ✅ |
| 10 | `stage-10-hardening-testing-golive/` | ✅ | ✅ |

Within each stage folder, files are numbered so they sort in the order you should use them: `01-backend-prompt.md` before `02-frontend-prompt.md`.

## The one shared file

[`00-DESIGN-SYSTEM.md`](00-DESIGN-SYSTEM.md) — the colors, type scale, spacing, components, and interaction rules every frontend prompt builds against. Set it up once in Stage 0 so every screen after that looks like it belongs to the same product, instead of each prompt inventing its own look. If you only read one file in this folder before starting, read this one.

## Why backend before frontend, every time

The frontend prompts in this folder reference real endpoint names and response shapes from the matching backend prompt. Building the API first means there's something real to point the typed client at and click through — building UI against an API that doesn't exist yet just produces screens you have to rebuild once the real shape shows up.

## Relationship to `/docs`

These prompts are deliberately compressed — they tell Claude Code exactly what to build and which doc section has the full detail, rather than re-explaining everything inline. Keep `/docs` around; the prompts lean on it.
