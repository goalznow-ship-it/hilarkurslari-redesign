import SectionPlaceholder from "@/components/admin/SectionPlaceholder";
import { BarChart3 } from "lucide-react";

export default function ReportsPage() {
  return (
    <SectionPlaceholder
      title="Hesabatlıq"
      description="İmtahan nəticələri üzrə statistik hesabatlar və ixracat burada yer alacaq."
      icon={BarChart3}
    />
  );
}

