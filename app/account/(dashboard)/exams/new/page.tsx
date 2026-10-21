"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import ExamForm from "@/components/ExamForm";
import { getSession } from "@/lib/store";

export default function NewExamPage() {
  const router = useRouter();

  useEffect(() => {
    if (!getSession()) router.replace("/admin/login");
  }, [router]);

  return (
    <div className="min-h-[100dvh] space-y-6">
      {/* Səhifə başlığı */}
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Yeni imtahan</h1>
        <p className="text-sm text-neutral-500">
          Şagirdlərin daxil olacağı aktiv imtahan yaradın.
        </p>
      </div>
      <ExamForm mode="create" />
    </div>
  );
}

