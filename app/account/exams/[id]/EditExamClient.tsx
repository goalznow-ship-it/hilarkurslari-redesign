"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ExamForm from "@/components/ExamForm";
import { getExam, getSession } from "@/lib/store";
import type { Exam } from "@/lib/types";

export default function EditExamClient({ id }: { id: string }) {
  const router = useRouter();
  const [exam, setExam] = useState<Exam | null | "loading">("loading");

  useEffect(() => {
    if (!getSession()) {
      router.replace("/account/login");
      return;
    }
    const t = setTimeout(() => {
      setExam(getExam(id) ?? null);
    }, 0);
    return () => clearTimeout(t);
  }, [id, router]);

  if (exam === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 text-gray-500">
        Yüklənir…
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-gray-600 mb-4">İmtahan tapılmadı.</p>
          <Link
            href="/account"
            className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
          >
            İdarə panelinə qayıt
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <nav className="border-b border-gray-200 bg-white px-6 py-3">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <img src="/logo.svg" alt="" className="h-8 w-8 rounded-lg" />
          <h1 className="font-bold text-gray-900 truncate">{exam.title}</h1>
          <Link
            href="/account"
            className="ml-auto text-sm font-medium text-blue-600 hover:underline shrink-0"
          >
            ← İdarə panelinə qayıt
          </Link>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 md:px-6 py-8">
        <ExamForm mode="edit" exam={exam} />
      </main>
    </div>
  );
}
