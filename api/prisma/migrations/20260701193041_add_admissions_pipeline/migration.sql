-- CreateEnum
CREATE TYPE "ApplicantStatus" AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'CONVERTED');

-- CreateEnum
CREATE TYPE "AdmissionFeeStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- AlterTable
ALTER TABLE "School" ADD COLUMN     "applicationFeeAmount" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "Applicant" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "gender" TEXT NOT NULL,
    "address" TEXT,
    "intendedClassLevel" TEXT NOT NULL,
    "guardianFirstName" TEXT NOT NULL,
    "guardianLastName" TEXT NOT NULL,
    "guardianEmail" TEXT NOT NULL,
    "guardianPhone" TEXT NOT NULL,
    "status" "ApplicantStatus" NOT NULL DEFAULT 'SUBMITTED',
    "applicationFeePaid" BOOLEAN NOT NULL DEFAULT false,
    "reviewerNotes" TEXT,
    "reviewedByStaffId" TEXT,
    "offerLetterUrl" TEXT,
    "convertedStudentId" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Applicant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdmissionFeeTransaction" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "authorizationUrl" TEXT,
    "status" "AdmissionFeeStatus" NOT NULL DEFAULT 'PENDING',
    "applicantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdmissionFeeTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Applicant_convertedStudentId_key" ON "Applicant"("convertedStudentId");

-- CreateIndex
CREATE INDEX "Applicant_status_idx" ON "Applicant"("status");

-- CreateIndex
CREATE INDEX "Applicant_guardianEmail_idx" ON "Applicant"("guardianEmail");

-- CreateIndex
CREATE UNIQUE INDEX "AdmissionFeeTransaction_reference_key" ON "AdmissionFeeTransaction"("reference");

-- AddForeignKey
ALTER TABLE "Applicant" ADD CONSTRAINT "Applicant_reviewedByStaffId_fkey" FOREIGN KEY ("reviewedByStaffId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Applicant" ADD CONSTRAINT "Applicant_convertedStudentId_fkey" FOREIGN KEY ("convertedStudentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdmissionFeeTransaction" ADD CONSTRAINT "AdmissionFeeTransaction_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "Applicant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
