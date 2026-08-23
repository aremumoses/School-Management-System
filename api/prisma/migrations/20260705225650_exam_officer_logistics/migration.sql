-- CreateEnum
CREATE TYPE "InvigilationRole" AS ENUM ('LEAD', 'ASSISTANT');

-- CreateEnum
CREATE TYPE "ExternalExamBody" AS ENUM ('BECE', 'WAEC', 'NECO', 'NABTEB', 'JAMB');

-- CreateEnum
CREATE TYPE "ExternalExamCandidateStatus" AS ENUM ('PENDING', 'REGISTERED', 'WITHDRAWN');

-- CreateTable
CREATE TABLE "ExamSession" (
    "id" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "armId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "termId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExamSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamHall" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExamHall_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamSeatAllocation" (
    "id" TEXT NOT NULL,
    "examSessionId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "hallId" TEXT NOT NULL,
    "seatNumber" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExamSeatAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvigilationDuty" (
    "id" TEXT NOT NULL,
    "examSessionId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "role" "InvigilationRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvigilationDuty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalExamCandidate" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "examBody" "ExternalExamBody" NOT NULL,
    "sessionYear" INTEGER NOT NULL,
    "subjectCombination" TEXT[],
    "registrationNumber" TEXT,
    "status" "ExternalExamCandidateStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalExamCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MalpracticeIncident" (
    "id" TEXT NOT NULL,
    "examSessionId" TEXT,
    "cbtAttemptId" TEXT,
    "studentId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "actionTaken" TEXT NOT NULL,
    "loggedByStaffId" TEXT NOT NULL,
    "loggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "relatedDisciplineIncidentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MalpracticeIncident_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExamSession_termId_date_idx" ON "ExamSession"("termId", "date");

-- CreateIndex
CREATE INDEX "ExamSession_armId_date_idx" ON "ExamSession"("armId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "ExamHall_name_key" ON "ExamHall"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ExamSeatAllocation_examSessionId_studentId_key" ON "ExamSeatAllocation"("examSessionId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "ExamSeatAllocation_examSessionId_hallId_seatNumber_key" ON "ExamSeatAllocation"("examSessionId", "hallId", "seatNumber");

-- CreateIndex
CREATE UNIQUE INDEX "InvigilationDuty_examSessionId_staffId_key" ON "InvigilationDuty"("examSessionId", "staffId");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalExamCandidate_studentId_examBody_sessionYear_key" ON "ExternalExamCandidate"("studentId", "examBody", "sessionYear");

-- CreateIndex
CREATE INDEX "MalpracticeIncident_studentId_idx" ON "MalpracticeIncident"("studentId");

-- AddForeignKey
ALTER TABLE "ExamSession" ADD CONSTRAINT "ExamSession_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamSession" ADD CONSTRAINT "ExamSession_armId_fkey" FOREIGN KEY ("armId") REFERENCES "Arm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamSession" ADD CONSTRAINT "ExamSession_termId_fkey" FOREIGN KEY ("termId") REFERENCES "Term"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamSeatAllocation" ADD CONSTRAINT "ExamSeatAllocation_examSessionId_fkey" FOREIGN KEY ("examSessionId") REFERENCES "ExamSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamSeatAllocation" ADD CONSTRAINT "ExamSeatAllocation_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamSeatAllocation" ADD CONSTRAINT "ExamSeatAllocation_hallId_fkey" FOREIGN KEY ("hallId") REFERENCES "ExamHall"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvigilationDuty" ADD CONSTRAINT "InvigilationDuty_examSessionId_fkey" FOREIGN KEY ("examSessionId") REFERENCES "ExamSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvigilationDuty" ADD CONSTRAINT "InvigilationDuty_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalExamCandidate" ADD CONSTRAINT "ExternalExamCandidate_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MalpracticeIncident" ADD CONSTRAINT "MalpracticeIncident_examSessionId_fkey" FOREIGN KEY ("examSessionId") REFERENCES "ExamSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MalpracticeIncident" ADD CONSTRAINT "MalpracticeIncident_cbtAttemptId_fkey" FOREIGN KEY ("cbtAttemptId") REFERENCES "CBTAttempt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MalpracticeIncident" ADD CONSTRAINT "MalpracticeIncident_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MalpracticeIncident" ADD CONSTRAINT "MalpracticeIncident_loggedByStaffId_fkey" FOREIGN KEY ("loggedByStaffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MalpracticeIncident" ADD CONSTRAINT "MalpracticeIncident_relatedDisciplineIncidentId_fkey" FOREIGN KEY ("relatedDisciplineIncidentId") REFERENCES "Incident"("id") ON DELETE SET NULL ON UPDATE CASCADE;
