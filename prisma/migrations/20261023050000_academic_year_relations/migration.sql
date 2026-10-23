-- Enforce new assignments and concurrent renames without rewriting legacy historical labels.
-- Validate existing rows only after an operator has reviewed their missing registry entries.
ALTER TABLE "Exam" ADD CONSTRAINT "Exam_academicYear_fkey" FOREIGN KEY ("academicYear") REFERENCES "AcademicYear"("label") ON UPDATE RESTRICT ON DELETE RESTRICT NOT VALID;
ALTER TABLE "SchoolClass" ADD CONSTRAINT "SchoolClass_academicYear_fkey" FOREIGN KEY ("academicYear") REFERENCES "AcademicYear"("label") ON UPDATE RESTRICT ON DELETE RESTRICT NOT VALID;
