-- DropForeignKey
ALTER TABLE "TeacherAssignment" DROP CONSTRAINT "TeacherAssignment_classSubjectId_fkey";

-- DropForeignKey
ALTER TABLE "TeacherAssignment" DROP CONSTRAINT "TeacherAssignment_termId_fkey";

-- AddForeignKey
ALTER TABLE "TeacherAssignment" ADD CONSTRAINT "TeacherAssignment_classSubjectId_fkey" FOREIGN KEY ("classSubjectId") REFERENCES "ClassSubject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherAssignment" ADD CONSTRAINT "TeacherAssignment_termId_fkey" FOREIGN KEY ("termId") REFERENCES "Term"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
