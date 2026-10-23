-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('single', 'true_false', 'multiple');

-- CreateEnum
CREATE TYPE "QuestionVerification" AS ENUM ('pending', 'verified', 'rejected');

-- CreateEnum
CREATE TYPE "ExamPhase" AS ENUM ('preparing', 'first_ready', 'review', 'done');

-- CreateEnum
CREATE TYPE "ExamStatus" AS ENUM ('planned', 'active', 'ended');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'coordinator', 'teacher', 'seller');

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademicYear" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AcademicYear_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "passwordHash" TEXT NOT NULL,
    "companyId" TEXT,
    "sellerExamIds" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Exam" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "durationMin" INTEGER NOT NULL,
    "questions" JSONB NOT NULL,
    "ticketCodes" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "ExamPhase" NOT NULL DEFAULT 'preparing',
    "code" TEXT,
    "grade" TEXT,
    "block" TEXT,
    "academicYear" TEXT,
    "variants" INTEGER NOT NULL DEFAULT 1,
    "pdfReady" BOOLEAN NOT NULL DEFAULT false,
    "onlineEnabled" BOOLEAN NOT NULL DEFAULT false,
    "companyId" TEXT,

    CONSTRAINT "Exam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamVersion" (
    "id" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "questions" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExamVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamAttempt" (
    "id" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "fin" TEXT NOT NULL,
    "ticketCode" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'in_progress',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),
    "expiredAt" TIMESTAMP(3),
    "timeSpentSec" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ExamAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamResult" (
    "id" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "attemptId" TEXT,
    "companyId" TEXT,
    "academicYear" TEXT,
    "examTitle" TEXT NOT NULL,
    "fin" TEXT NOT NULL,
    "ticketCode" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "questionsSnapshot" JSONB NOT NULL,
    "correctCount" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "score" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "finishedAt" TIMESTAMP(3) NOT NULL,
    "timeSpentSec" INTEGER NOT NULL,
    "accessToken" TEXT NOT NULL,

    CONSTRAINT "ExamResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "options" TEXT[],
    "correct" JSONB NOT NULL,
    "type" "QuestionType" NOT NULL,
    "subject" TEXT,
    "topic" TEXT,
    "tags" TEXT[],
    "grade" TEXT,
    "difficulty" TEXT,
    "explanation" TEXT,
    "points" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "imageUrl" TEXT,
    "imageAlt" TEXT,
    "optionImages" JSONB,
    "verification" "QuestionVerification" NOT NULL DEFAULT 'pending',
    "reviewHistory" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolClass" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "grade" TEXT NOT NULL,
    "section" TEXT,
    "teacher" TEXT NOT NULL,
    "studentCount" INTEGER NOT NULL DEFAULT 0,
    "academicYear" TEXT NOT NULL,
    "companyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SchoolClass_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketSale" (
    "id" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "examTitle" TEXT NOT NULL,
    "ticketCode" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "sellerName" TEXT NOT NULL,
    "studentFIN" TEXT NOT NULL,
    "studentName" TEXT,
    "soldAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "price" DOUBLE PRECISION NOT NULL,
    "companyId" TEXT,

    CONSTRAINT "TicketSale_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Company_code_key" ON "Company"("code");

-- CreateIndex
CREATE UNIQUE INDEX "AcademicYear_label_key" ON "AcademicYear"("label");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_companyId_idx" ON "User"("companyId");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_token_idx" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Exam_code_key" ON "Exam"("code");

-- CreateIndex
CREATE INDEX "Exam_companyId_idx" ON "Exam"("companyId");

-- CreateIndex
CREATE INDEX "Exam_academicYear_idx" ON "Exam"("academicYear");

-- CreateIndex
CREATE INDEX "Exam_onlineEnabled_idx" ON "Exam"("onlineEnabled");

-- CreateIndex
CREATE INDEX "Exam_status_idx" ON "Exam"("status");

-- CreateIndex
CREATE INDEX "ExamVersion_examId_idx" ON "ExamVersion"("examId");

-- CreateIndex
CREATE INDEX "ExamAttempt_examId_status_idx" ON "ExamAttempt"("examId", "status");

-- CreateIndex
CREATE INDEX "ExamAttempt_fin_idx" ON "ExamAttempt"("fin");

-- CreateIndex
CREATE INDEX "ExamAttempt_ticketCode_idx" ON "ExamAttempt"("ticketCode");

-- CreateIndex
CREATE UNIQUE INDEX "ExamAttempt_examId_fin_key" ON "ExamAttempt"("examId", "fin");

-- CreateIndex
CREATE UNIQUE INDEX "ExamAttempt_examId_ticketCode_key" ON "ExamAttempt"("examId", "ticketCode");

-- CreateIndex
CREATE UNIQUE INDEX "ExamResult_attemptId_key" ON "ExamResult"("attemptId");

-- CreateIndex
CREATE UNIQUE INDEX "ExamResult_accessToken_key" ON "ExamResult"("accessToken");

-- CreateIndex
CREATE INDEX "ExamResult_examId_idx" ON "ExamResult"("examId");

-- CreateIndex
CREATE INDEX "ExamResult_fin_idx" ON "ExamResult"("fin");

-- CreateIndex
CREATE INDEX "ExamResult_ticketCode_idx" ON "ExamResult"("ticketCode");

-- CreateIndex
CREATE INDEX "ExamResult_companyId_idx" ON "ExamResult"("companyId");

-- CreateIndex
CREATE INDEX "ExamResult_academicYear_idx" ON "ExamResult"("academicYear");

-- CreateIndex
CREATE INDEX "ExamResult_accessToken_idx" ON "ExamResult"("accessToken");

-- CreateIndex
CREATE INDEX "Question_subject_idx" ON "Question"("subject");

-- CreateIndex
CREATE INDEX "Question_grade_idx" ON "Question"("grade");

-- CreateIndex
CREATE INDEX "Question_topic_idx" ON "Question"("topic");

-- CreateIndex
CREATE INDEX "Question_difficulty_idx" ON "Question"("difficulty");

-- CreateIndex
CREATE INDEX "Question_verification_idx" ON "Question"("verification");

-- CreateIndex
CREATE INDEX "SchoolClass_companyId_idx" ON "SchoolClass"("companyId");

-- CreateIndex
CREATE INDEX "SchoolClass_academicYear_idx" ON "SchoolClass"("academicYear");

-- CreateIndex
CREATE INDEX "SchoolClass_grade_idx" ON "SchoolClass"("grade");

-- CreateIndex
CREATE INDEX "TicketSale_sellerId_idx" ON "TicketSale"("sellerId");

-- CreateIndex
CREATE INDEX "TicketSale_examId_idx" ON "TicketSale"("examId");

-- CreateIndex
CREATE INDEX "TicketSale_companyId_idx" ON "TicketSale"("companyId");

-- CreateIndex
CREATE INDEX "TicketSale_soldAt_idx" ON "TicketSale"("soldAt");

-- CreateIndex
CREATE UNIQUE INDEX "TicketSale_examId_ticketCode_key" ON "TicketSale"("examId", "ticketCode");

-- CreateIndex
CREATE UNIQUE INDEX "TicketSale_examId_studentFIN_key" ON "TicketSale"("examId", "studentFIN");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exam" ADD CONSTRAINT "Exam_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamVersion" ADD CONSTRAINT "ExamVersion_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamAttempt" ADD CONSTRAINT "ExamAttempt_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamAttempt" ADD CONSTRAINT "ExamAttempt_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "ExamVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamResult" ADD CONSTRAINT "ExamResult_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamResult" ADD CONSTRAINT "ExamResult_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "ExamAttempt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamResult" ADD CONSTRAINT "ExamResult_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolClass" ADD CONSTRAINT "SchoolClass_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketSale" ADD CONSTRAINT "TicketSale_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketSale" ADD CONSTRAINT "TicketSale_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketSale" ADD CONSTRAINT "TicketSale_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
