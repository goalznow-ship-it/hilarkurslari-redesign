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
    <div className="rounded-xl border border-neutral-200 bg-white p-10 text-center shadow-sm">
      <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-brand-700/10">
        <Icon className="size-6 text-brand-700" />
      </div>
      <h1 className="text-lg font-semibold text-neutral-900">{title}</h1>
      <p className="mx-auto mt-2 max-w-sm text-sm text-neutral-500">{description}</p>
      <p className="mt-1 text-xs text-neutral-400">
        Demo versiyada bu bölmə hazırlıqdadır.
      </p>
      <Link
        href="/account"
        className="mt-6 inline-flex items-center gap-2 rounded-md bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 transition-colors"
      >
        <ArrowLeft className="size-4" />
        İdarəetmə panelinə qayıt
      </Link>
    </div>
  );
}
