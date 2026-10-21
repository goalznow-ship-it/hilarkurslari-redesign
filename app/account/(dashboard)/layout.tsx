import { Suspense } from "react";
import DashboardShell from "@/components/admin/DashboardShell";

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
      <DashboardShell>{children}</DashboardShell>
    </Suspense>
  );
}
