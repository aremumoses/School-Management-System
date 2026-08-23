-- CreateEnum
CREATE TYPE "QuestionDifficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('MCQ_SINGLE', 'MCQ_MULTIPLE', 'TRUE_FALSE', 'FILL_BLANK', 'MATCHING', 'ESSAY');

-- CreateEnum
CREATE TYPE "QuestionStatus" AS ENUM ('PENDING', 'APPROVED', 'RETURNED');

-- CreateEnum
CREATE TYPE "CBTAttemptStatus" AS ENUM ('IN_PROGRESS', 'SUBMITTED', 'AUTO_SUBMITTED');

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "classLevel" INTEGER NOT NULL,
    "difficulty" "QuestionDifficulty" NOT NULL,
    "bloomTag" TEXT,
    "type" "QuestionType" NOT NULL,
    "prompt" TEXT NOT NULL,
    "imageUrl" TEXT,
    "options" JSONB,
    "correctAnswer" JSONB,
    "status" "QuestionStatus" NOT NULL DEFAULT 'PENDING',
    "reviewerNotes" TEXT,
    "authoredByStaffId" TEXT NOT NULL,
    "reviewedByStaffId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CBTTest" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "classSubjectId" TEXT NOT NULL,
    "timeLimitMinutes" INTEGER NOT NULL,
    "attemptsAllowed" INTEGER NOT NULL DEFAULT 1,
    "availableFrom" TIMESTAMP(3) NOT NULL,
    "availableTo" TIMESTAMP(3) NOT NULL,
    "passMark" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "instantRelease" BOOLEAN NOT NULL DEFAULT true,
    "showCorrectAnswersAfter" BOOLEAN NOT NULL DEFAULT false,
    "isMockPractice" BOOLEAN NOT NULL DEFAULT false,
    "assessmentComponentId" TEXT,
    "createdByStaffId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CBTTest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CBTTestQuestion" (
    "id" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "points" DOUBLE PRECISION NOT NULL DEFAULT 1,

    CONSTRAINT "CBTTestQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CBTAttempt" (
    "id" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "status" "CBTAttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),
    "questionOrder" JSONB NOT NULL,
    "optionOrders" JSONB NOT NULL,
    "score" DOUBLE PRECISION,
    "maxScore" DOUBLE PRECISION NOT NULL,
    "gradedAt" TIMESTAMP(3),

    CONSTRAINT "CBTAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CBTAnswer" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "answer" JSONB NOT NULL,
    "score" DOUBLE PRECISION,
    "feedback" TEXT,
    "answeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CBTAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Question_subjectId_topic_difficulty_idx" ON "Question"("subjectId", "topic", "difficulty");

-- CreateIndex
CREATE INDEX "Question_status_idx" ON "Question"("status");

-- CreateIndex
CREATE INDEX "CBTTest_classSubjectId_idx" ON "CBTTest"("classSubjectId");

-- CreateIndex
CREATE INDEX "CBTTest_availableFrom_availableTo_idx" ON "CBTTest"("availableFrom", "availableTo");

-- CreateIndex
CREATE UNIQUE INDEX "CBTTestQuestion_testId_questionId_key" ON "CBTTestQuestion"("testId", "questionId");

-- CreateIndex
CREATE INDEX "CBTAttempt_testId_studentId_idx" ON "CBTAttempt"("testId", "studentId");

-- CreateIndex
CREATE INDEX "CBTAttempt_status_idx" ON "CBTAttempt"("status");

-- CreateIndex
CREATE UNIQUE INDEX "CBTAnswer_attemptId_questionId_key" ON "CBTAnswer"("attemptId", "questionId");

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_authoredByStaffId_fkey" FOREIGN KEY ("authoredByStaffId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_reviewedByStaffId_fkey" FOREIGN KEY ("reviewedByStaffId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CBTTest" ADD CONSTRAINT "CBTTest_classSubjectId_fkey" FOREIGN KEY ("classSubjectId") REFERENCES "ClassSubject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CBTTest" ADD CONSTRAINT "CBTTest_assessmentComponentId_fkey" FOREIGN KEY ("assessmentComponentId") REFERENCES "AssessmentComponent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CBTTest" ADD CONSTRAINT "CBTTest_createdByStaffId_fkey" FOREIGN KEY ("createdByStaffId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CBTTestQuestion" ADD CONSTRAINT "CBTTestQuestion_testId_fkey" FOREIGN KEY ("testId") REFERENCES "CBTTest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CBTTestQuestion" ADD CONSTRAINT "CBTTestQuestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CBTAttempt" ADD CONSTRAINT "CBTAttempt_testId_fkey" FOREIGN KEY ("testId") REFERENCES "CBTTest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CBTAttempt" ADD CONSTRAINT "CBTAttempt_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CBTAnswer" ADD CONSTRAINT "CBTAnswer_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "CBTAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
