-- AlterTable
ALTER TABLE "Arm" ADD COLUMN     "classTeacherId" TEXT;

-- AlterTable
ALTER TABLE "School" ADD COLUMN     "admissionNumberFormat" TEXT NOT NULL DEFAULT 'STU{year}{sequence}';

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "documents" JSONB;

-- AddForeignKey
ALTER TABLE "Arm" ADD CONSTRAINT "Arm_classTeacherId_fkey" FOREIGN KEY ("classTeacherId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;
