import SectionPlaceholder from "@/components/admin/SectionPlaceholder";
import { BadgeCheck } from "lucide-react";

export default function QuestionVerificationPage() {
  return (
    <SectionPlaceholder
      title="Sual Təsdiqi"
      description="Yeni əlavə edilən sualların yoxlanması və təsdiq prosesi burada aparılacaq."
      icon={BadgeCheck}
    />
  );
}

