import { Suspense } from "react";
import DashboardShell from "@/components/admin/DashboardShell";
import { ToastProvider } from "@/components/ui";

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<div className="min-h-[100dvh] bg-neutral-50" />}>
      <ToastProvider>
        <DashboardShell>{children}</DashboardShell>
      </ToastProvider>
    </Suspense>
  );
}
