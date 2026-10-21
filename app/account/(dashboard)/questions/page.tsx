import SectionPlaceholder from "@/components/admin/SectionPlaceholder";
import { FileQuestion } from "lucide-react";

export default function QuestionsPage() {
  return (
    <SectionPlaceholder
      title="Suallar"
      description="Sual bankı — fənnə görə sualların siyahısı və redaktəs burada olacaq."
      icon={FileQuestion}
    />
  );
}

