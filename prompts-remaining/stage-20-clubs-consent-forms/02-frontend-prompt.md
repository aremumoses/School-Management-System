# Stage 20 — Frontend Prompt (Clubs & Activities, Consent Forms)

> Copy everything below the line into Claude Code as one message. Assumes this stage's backend prompt is done.

---

Follow `prompts/00-DESIGN-SYSTEM.md` throughout.

## 1. Admin Clubs management (`/admin/clubs`)
- A simple list (name, patron, member count) with create/edit (`Dialog` form, per Stage 9's established form-dialog pattern) and a member-roster view per club (add/remove students via a picker, same student-Select pattern used throughout Stages 9/12).

## 2. Student Clubs & Activities (`/student/clubs`)
- A read-only card list of the clubs the student belongs to, each showing the patron and meeting schedule.

## 3. Consent Forms — creation + responses (`/admin/consent-forms`, staff-facing)
- A list of sent consent forms (title, type, target scope, response tally) with a "New Consent Form" action (title, description, type, target class/whole-school). Detail view shows the full respondent list (consented/declined/no-response), same layout as Stage 9's event-RSVP respondent list.

## 4. Parent Consent Forms (`/parent/consent`)
- Per-child (reuse `ChildSwitcher`) list of consent forms awaiting or already given a response, each with a clear Consent/Decline action requiring the parent to type their full name as the e-signature confirmation before submitting (a lightweight `AlertDialog`-style deliberate-confirmation step, not a casual single click — these are medical/excursion permissions, treat them with the same weight as Stage 9's irreversible-action confirmations).

**Done when**: an Admin-created club shows correctly on the enrolled student's `/student/clubs`, and a Class-Teacher-sent excursion consent form can be e-signed by a parent (consented or declined) with the response visible back to the sender, including which guardians haven't responded yet.
