-- CreateEnum
CREATE TYPE "ResourceType" AS ENUM ('NOTE', 'SLIDES', 'PAST_QUESTION', 'VIDEO_LINK');

-- CreateTable
CREATE TABLE "Resource" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "topic" TEXT,
    "type" "ResourceType" NOT NULL,
    "fileUrl" TEXT,
    "externalUrl" TEXT,
    "subjectId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "uploadedByStaffId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Resource_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Resource_classId_subjectId_idx" ON "Resource"("classId", "subjectId");

-- CreateIndex
CREATE INDEX "Resource_uploadedByStaffId_idx" ON "Resource"("uploadedByStaffId");

-- AddForeignKey
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_uploadedByStaffId_fkey" FOREIGN KEY ("uploadedByStaffId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;
