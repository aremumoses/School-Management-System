-- CreateEnum
CREATE TYPE "LessonNoteStatus" AS ENUM ('PENDING', 'APPROVED', 'RETURNED');

-- CreateTable
CREATE TABLE "LessonNote" (
    "id" TEXT NOT NULL,
    "classSubjectId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "weekOfTerm" INTEGER NOT NULL,
    "topic" TEXT NOT NULL,
    "nerdcReference" TEXT,
    "objectives" TEXT,
    "content" TEXT NOT NULL,
    "activities" TEXT,
    "evaluation" TEXT,
    "attachmentUrl" TEXT,
    "status" "LessonNoteStatus" NOT NULL DEFAULT 'PENDING',
    "submittedByStaffId" TEXT NOT NULL,
    "reviewedByStaffId" TEXT,
    "reviewerNotes" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LessonNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LessonNote_classSubjectId_termId_idx" ON "LessonNote"("classSubjectId", "termId");

-- CreateIndex
CREATE INDEX "LessonNote_submittedByStaffId_termId_idx" ON "LessonNote"("submittedByStaffId", "termId");

-- CreateIndex
CREATE INDEX "LessonNote_status_idx" ON "LessonNote"("status");

-- AddForeignKey
ALTER TABLE "LessonNote" ADD CONSTRAINT "LessonNote_classSubjectId_fkey" FOREIGN KEY ("classSubjectId") REFERENCES "ClassSubject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonNote" ADD CONSTRAINT "LessonNote_termId_fkey" FOREIGN KEY ("termId") REFERENCES "Term"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonNote" ADD CONSTRAINT "LessonNote_submittedByStaffId_fkey" FOREIGN KEY ("submittedByStaffId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonNote" ADD CONSTRAINT "LessonNote_reviewedByStaffId_fkey" FOREIGN KEY ("reviewedByStaffId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;
