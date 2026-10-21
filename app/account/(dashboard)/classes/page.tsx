import SectionPlaceholder from "@/components/admin/SectionPlaceholder";
import { Users } from "lucide-react";

export default function ClassesPage() {
  return (
    <SectionPlaceholder
      title="Siniflər"
      description="Siniflər, şöbələr və şagird qruplarını burada idarə edəcəksiniz."
      icon={Users}
    />
  );
}

