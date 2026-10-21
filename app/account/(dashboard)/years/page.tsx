import SectionPlaceholder from "@/components/admin/SectionPlaceholder";
import { CalendarRange } from "lucide-react";

export default function YearsPage() {
  return (
    <SectionPlaceholder
      title="Tədris İlləri"
      description="Aktiv və arxiv tədris illəri, dövr başlanğıcı\/bitməsi burada tənzimlənəcək."
      icon={CalendarRange}
    />
  );
}

