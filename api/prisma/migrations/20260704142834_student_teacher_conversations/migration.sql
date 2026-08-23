-- AlterTable
ALTER TABLE "Conversation" ALTER COLUMN "guardianId" DROP NOT NULL;

-- Direct staff<->student threads (guardianId IS NULL) need their own
-- uniqueness guarantee — the composite unique above treats NULLs as
-- distinct in Postgres, so without this a retried create could produce
-- duplicate threads for the same (staff, student) pair.
CREATE UNIQUE INDEX "Conversation_staff_student_direct_key"
  ON "Conversation"("staffId", "studentId")
  WHERE "guardianId" IS NULL;
