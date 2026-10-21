"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import {
  deleteExam,
  getExams,
  getResults,
  initStore,
  getSession,
} from "@/lib/store";
import {
  STATUS_LABELS,
  STATUS_STYLES,
  examStatus,
  formatDateTime,
} from "@/lib/helpers";
import type { Exam, ExamResult } from "@/lib/types";

export default function ExamsPage() {
  const router = useRouter();
  const [exams, setExams] = useState<Exam[]>([]);
  const [results, setResults] = useState<ExamResult[]>([]);

  useEffect(() => {
    if (!getSession()) {
      router.replace("/account/login");
      return;
    }
    const t = setTimeout(() => {
      initStore();
      setExams(getExams());
      setResults(getResults());
    }, 0);
    return () => clearTimeout(t);
  }, [router]);

  const handleDelete = (exam: Exam) => {
    if (
      window.confirm(
        `"${exam.title}" imtahanı və ona aid bütün nəticələr silinəcək. Davam edilsin?`,
      )
    ) {
      deleteExam(exam.id);
      setExams(getExams());
      setResults(getResults());
    }
  };

  return (
    <div className="space-y-6">
      {/* Səhifə başlığı */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">İmtahanlar</h1>
          <p className="text-sm text-slate-500">
            Bütün imtahanların siyahısı — açıq, gözləmədə və bitmiş.
          </p>
        </div>
        <Link
          href="/account/exams/new"
          className="inline-flex items-center gap-2 rounded-md bg-[#4a1c2c] px-4 py-2 text-sm font-medium text-white hover:bg-[#381420] transition-colors"
        >
          <Plus className="size-4" />
          Yeni imtahan
        </Link>
      </div>

      {exams.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <p className="text-sm text-slate-500">
            Hələ imtahan yaradılmayıb.{" "}
            <Link href="/account/exams/new" className="text-[#4a1c2c] hover:underline font-medium">
              Yeni imtahan yaradın
            </Link>
            .
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs text-slate-500">
                <th className="px-6 py-3.5 font-medium">Ad</th>
                <th className="px-4 py-3.5 font-medium">Müddət</th>
                <th className="px-4 py-3.5 font-medium">Suallar</th>
                <th className="px-4 py-3.5 font-medium">İştirakçı</th>
                <th className="px-4 py-3.5 font-medium">Vəziyyət</th>
                <th className="px-6 py-3.5 font-medium text-right">Əməliyyat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {exams.map((exam) => {
                const status = examStatus(exam);
                const partCount = results.filter((r) => r.examId === exam.id).length;
                return (
                  <tr key={exam.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-900">{exam.title}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {formatDateTime(exam.startsAt)} – {formatDateTime(exam.endsAt)}
                      </p>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-slate-700">
                      {exam.durationMin} dəq
                    </td>
                    <td className="px-4 py-4 text-slate-700">{exam.questions.length}</td>
                    <td className="px-4 py-4 text-slate-700">{partCount}</td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          STATUS_STYLES[status]
                        }`}
                      >
                        {STATUS_LABELS[status]}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <Link
                        href={`/account/exams/${exam.id}`}
                        className="mr-4 text-sm font-medium text-[#4a1c2c] hover:underline"
                      >
                        Redaktə
                      </Link>
                      <button
                        onClick={() => handleDelete(exam)}
                        className="text-sm font-medium text-red-600 hover:underline"
                      >
                        Sil
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

