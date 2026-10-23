"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ExamForm from "@/components/ExamForm";
import { getExam, getSession } from "@/lib/backend-store";
import type { Exam } from "@/lib/types";

export default function EditExamClient({ id }: { id: string }) {
  const router = useRouter();
  const [exam, setExam] = useState<Exam | null | "loading">("loading");

  useEffect(() => {
    if (!getSession()) {
      router.replace("/admin/login");
      return;
    }
    const t = setTimeout(() => {
      setExam(getExam(id) ?? null);
    }, 0);
    return () => clearTimeout(t);
  }, [id, router]);

  if (exam === "loading") {
    return (
      <div className="flex h-64 items-center justify-center text-neutral-500">
        Yüklənir…
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="rounded-xl border border-neutral-200 bg-white p-10 text-center shadow-sm">
        <p className="text-neutral-600 mb-4">İmtahan tapılmadı.</p>
        <Link
          href="/account/exams"
          className="inline-flex items-center gap-2 rounded-md bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 transition-colors"
        >
          İmtahanlar siyahısına qayıt
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Səhifə başlığı */}
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">{exam.title}</h1>
        <p className="text-sm text-neutral-500">
          İmtahan məlumatlarını və suallarını redaktə edin.
        </p>
      </div>
      <ExamForm mode="edit" exam={exam} />
    </div>
  );
}
