/*
  Warnings:

  - A unique constraint covering the columns `[qrToken]` on the table `Student` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "AtRiskReason" AS ENUM ('ATTENDANCE', 'CA', 'BOTH');

-- AlterTable
ALTER TABLE "School" ADD COLUMN     "atRiskConfig" JSONB;

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "qrToken" TEXT;

-- CreateTable
CREATE TABLE "AtRiskFlag" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "reason" "AtRiskReason" NOT NULL,
    "attendanceRate" DOUBLE PRECISION,
    "caAverage" DOUBLE PRECISION,
    "flaggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AtRiskFlag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AtRiskFlag_studentId_idx" ON "AtRiskFlag"("studentId");

-- CreateIndex
CREATE INDEX "AtRiskFlag_resolvedAt_idx" ON "AtRiskFlag"("resolvedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Student_qrToken_key" ON "Student"("qrToken");

-- AddForeignKey
ALTER TABLE "AtRiskFlag" ADD CONSTRAINT "AtRiskFlag_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AtRiskFlag" ADD CONSTRAINT "AtRiskFlag_termId_fkey" FOREIGN KEY ("termId") REFERENCES "Term"("id") ON DELETE CASCADE ON UPDATE CASCADE;
