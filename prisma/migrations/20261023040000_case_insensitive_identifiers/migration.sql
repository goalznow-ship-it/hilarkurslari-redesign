-- Fails safely on legacy case-only conflicts; resolve those explicitly before deployment.
CREATE UNIQUE INDEX "User_email_case_insensitive_key" ON "User" (lower("email"));
CREATE UNIQUE INDEX "Exam_code_case_insensitive_key" ON "Exam" (upper("code")) WHERE "code" IS NOT NULL;
CREATE UNIQUE INDEX "Company_code_case_insensitive_key" ON "Company" (upper("code"));
