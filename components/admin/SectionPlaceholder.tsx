import Link from "next/link";
import { type LucideIcon, ArrowLeft } from "lucide-react";

export default function SectionPlaceholder({
  title,
  description,
  icon: Icon,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm">
      <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-[#4a1c2c]/10">
        <Icon className="size-6 text-[#4a1c2c]" />
      </div>
      <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
      <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">{description}</p>
      <p className="mt-1 text-xs text-slate-400">
        Demo versiyada bu bölmə hazırlıqdadır.
      </p>
      <Link
        href="/account"
        className="mt-6 inline-flex items-center gap-2 rounded-md bg-[#4a1c2c] px-4 py-2 text-sm font-medium text-white hover:bg-[#381420] transition-colors"
      >
        <ArrowLeft className="size-4" />
        İdarəetmə panelinə qayıt
      </Link>
    </div>
  );
}
