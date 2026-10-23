ALTER TABLE "Question" ADD COLUMN "companyId" TEXT;
ALTER TABLE "Question" ADD CONSTRAINT "Question_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Question_companyId_idx" ON "Question"("companyId");
