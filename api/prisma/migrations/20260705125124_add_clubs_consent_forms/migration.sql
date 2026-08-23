-- CreateEnum
CREATE TYPE "ConsentFormType" AS ENUM ('EXCURSION', 'MEDICAL', 'PHOTO_VIDEO', 'OTHER');

-- CreateEnum
CREATE TYPE "ConsentResponseValue" AS ENUM ('CONSENTED', 'DECLINED');

-- CreateTable
CREATE TABLE "Club" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "meetingSchedule" TEXT,
    "patronStaffId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Club_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClubMembership" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClubMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsentForm" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "ConsentFormType" NOT NULL,
    "targetType" "BroadcastTargetType" NOT NULL DEFAULT 'WHOLE_SCHOOL',
    "targetArmId" TEXT,
    "createdByStaffId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsentForm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsentResponse" (
    "id" TEXT NOT NULL,
    "consentFormId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "guardianId" TEXT NOT NULL,
    "response" "ConsentResponseValue" NOT NULL,
    "signatureName" TEXT NOT NULL,
    "respondedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsentResponse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Club_name_key" ON "Club"("name");

-- CreateIndex
CREATE INDEX "ClubMembership_studentId_idx" ON "ClubMembership"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "ClubMembership_clubId_studentId_key" ON "ClubMembership"("clubId", "studentId");

-- CreateIndex
CREATE INDEX "ConsentForm_targetArmId_idx" ON "ConsentForm"("targetArmId");

-- CreateIndex
CREATE INDEX "ConsentResponse_guardianId_idx" ON "ConsentResponse"("guardianId");

-- CreateIndex
CREATE UNIQUE INDEX "ConsentResponse_consentFormId_studentId_key" ON "ConsentResponse"("consentFormId", "studentId");

-- AddForeignKey
ALTER TABLE "Club" ADD CONSTRAINT "Club_patronStaffId_fkey" FOREIGN KEY ("patronStaffId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubMembership" ADD CONSTRAINT "ClubMembership_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubMembership" ADD CONSTRAINT "ClubMembership_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentForm" ADD CONSTRAINT "ConsentForm_createdByStaffId_fkey" FOREIGN KEY ("createdByStaffId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentResponse" ADD CONSTRAINT "ConsentResponse_consentFormId_fkey" FOREIGN KEY ("consentFormId") REFERENCES "ConsentForm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentResponse" ADD CONSTRAINT "ConsentResponse_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentResponse" ADD CONSTRAINT "ConsentResponse_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "Guardian"("id") ON DELETE CASCADE ON UPDATE CASCADE;
