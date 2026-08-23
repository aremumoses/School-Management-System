-- CreateEnum
CREATE TYPE "ResultStage" AS ENUM ('SCORES_IN_PROGRESS', 'PENDING_COLLATION', 'PENDING_APPROVAL', 'RETURNED', 'APPROVED', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "ConductDomain" AS ENUM ('AFFECTIVE', 'PSYCHOMOTOR');

-- CreateTable
CREATE TABLE "AssessmentComponent" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "maxScore" DOUBLE PRECISION NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "termId" TEXT NOT NULL,
    "subjectId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssessmentComponent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Score" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "classSubjectId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "assessmentComponentId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "enteredByStaffId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Score_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScoreSubmission" (
    "id" TEXT NOT NULL,
    "classSubjectId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "submittedByStaffId" TEXT NOT NULL,
    "locked" BOOLEAN NOT NULL DEFAULT true,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unlockedAt" TIMESTAMP(3),
    "unlockedByStaffId" TEXT,
    "unlockReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScoreSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConductRating" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "domain" "ConductDomain" NOT NULL,
    "category" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConductRating_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentTermResult" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "armId" TEXT NOT NULL,
    "formTeacherComment" TEXT,
    "principalComment" TEXT,
    "overallAverage" DOUBLE PRECISION,
    "overallPosition" INTEGER,
    "classSize" INTEGER,
    "reportCardUrl" TEXT,
    "reportCardGeneratedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentTermResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassTermResultStatus" (
    "id" TEXT NOT NULL,
    "armId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "stage" "ResultStage" NOT NULL DEFAULT 'SCORES_IN_PROGRESS',
    "returnReason" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClassTermResultStatus_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentComponent_termId_subjectId_name_key" ON "AssessmentComponent"("termId", "subjectId", "name");

-- CreateIndex
CREATE INDEX "Score_classSubjectId_termId_idx" ON "Score"("classSubjectId", "termId");

-- CreateIndex
CREATE UNIQUE INDEX "Score_studentId_classSubjectId_termId_assessmentComponentId_key" ON "Score"("studentId", "classSubjectId", "termId", "assessmentComponentId");

-- CreateIndex
CREATE UNIQUE INDEX "ScoreSubmission_classSubjectId_termId_key" ON "ScoreSubmission"("classSubjectId", "termId");

-- CreateIndex
CREATE UNIQUE INDEX "ConductRating_studentId_termId_domain_category_key" ON "ConductRating"("studentId", "termId", "domain", "category");

-- CreateIndex
CREATE UNIQUE INDEX "StudentTermResult_studentId_termId_key" ON "StudentTermResult"("studentId", "termId");

-- CreateIndex
CREATE UNIQUE INDEX "ClassTermResultStatus_armId_termId_key" ON "ClassTermResultStatus"("armId", "termId");

-- AddForeignKey
ALTER TABLE "AssessmentComponent" ADD CONSTRAINT "AssessmentComponent_termId_fkey" FOREIGN KEY ("termId") REFERENCES "Term"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentComponent" ADD CONSTRAINT "AssessmentComponent_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Score" ADD CONSTRAINT "Score_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Score" ADD CONSTRAINT "Score_classSubjectId_fkey" FOREIGN KEY ("classSubjectId") REFERENCES "ClassSubject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Score" ADD CONSTRAINT "Score_termId_fkey" FOREIGN KEY ("termId") REFERENCES "Term"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Score" ADD CONSTRAINT "Score_assessmentComponentId_fkey" FOREIGN KEY ("assessmentComponentId") REFERENCES "AssessmentComponent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Score" ADD CONSTRAINT "Score_enteredByStaffId_fkey" FOREIGN KEY ("enteredByStaffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreSubmission" ADD CONSTRAINT "ScoreSubmission_classSubjectId_fkey" FOREIGN KEY ("classSubjectId") REFERENCES "ClassSubject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreSubmission" ADD CONSTRAINT "ScoreSubmission_termId_fkey" FOREIGN KEY ("termId") REFERENCES "Term"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreSubmission" ADD CONSTRAINT "ScoreSubmission_submittedByStaffId_fkey" FOREIGN KEY ("submittedByStaffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreSubmission" ADD CONSTRAINT "ScoreSubmission_unlockedByStaffId_fkey" FOREIGN KEY ("unlockedByStaffId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConductRating" ADD CONSTRAINT "ConductRating_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConductRating" ADD CONSTRAINT "ConductRating_termId_fkey" FOREIGN KEY ("termId") REFERENCES "Term"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentTermResult" ADD CONSTRAINT "StudentTermResult_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentTermResult" ADD CONSTRAINT "StudentTermResult_termId_fkey" FOREIGN KEY ("termId") REFERENCES "Term"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentTermResult" ADD CONSTRAINT "StudentTermResult_armId_fkey" FOREIGN KEY ("armId") REFERENCES "Arm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassTermResultStatus" ADD CONSTRAINT "ClassTermResultStatus_armId_fkey" FOREIGN KEY ("armId") REFERENCES "Arm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassTermResultStatus" ADD CONSTRAINT "ClassTermResultStatus_termId_fkey" FOREIGN KEY ("termId") REFERENCES "Term"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
