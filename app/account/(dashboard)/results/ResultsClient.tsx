"use client";

import { useRouter } from "next/navigation";
import { use, useEffect, useMemo, useState } from "react";
import { getExams, getResults, initStore, getSession } from "@/lib/store";
import { formatDateTime } from "@/lib/helpers";
import type { Exam, ExamResult } from "@/lib/types";

export default function ResultsClient({
  searchParams,
}: {
  searchParams: Promise<{ examId?: string }>;
}) {
  const router = useRouter();
  const params = use(searchParams);

  const [exams, setExams] = useState<Exam[]>([]);
  const [results, setResults] = useState<ExamResult[]>([]);
  // URL-dəki filtr (examId) — istifadəçi seçim dəyişəndə onu üstün tutur
  const [manualExamId, setManualExamId] = useState<string | null>(null);

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

  const paramExamId = params.examId ?? "all";
  const filterExamId =
    manualExamId ??
    (exams.some((e) => e.id === paramExamId) ? paramExamId : "all");

  const filtered = useMemo(
    () =>
      results
        .filter((r) => filterExamId === "all" || r.examId === filterExamId)
        .sort((a, b) => b.finishedAt.localeCompare(a.finishedAt)),
    [results, filterExamId],
  );

  const activeExam = exams.find((e) => e.id === filterExamId);

  return (
    <div className="space-y-6">
      {/* Səhifə başlığı */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Nəticələr</h1>
          <p className="text-sm text-slate-500">
            {activeExam
              ? `${activeExam.title} — bütün nəticələr.`
              : "Bütün imtahan nəticələri — şagird, bal və vaxt üzrə."}
          </p>
        </div>
        <select
          value={filterExamId}
          onChange={(e) => setManualExamId(e.target.value)}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-[#4a1c2c] focus:ring-2 focus:ring-[#4a1c2c]/30"
        >
          <option value="all">Bütün imtahanlar</option>
          {exams.map((exam) => (
            <option key={exam.id} value={exam.id}>
              {exam.title}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <p className="text-sm text-slate-500">Bu filtr üzrə nəticə yoxdur.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs text-slate-500">
                <th className="px-6 py-3.5 font-medium">FİN</th>
                <th className="px-4 py-3.5 font-medium">İmtahan</th>
                <th className="px-4 py-3.5 font-medium">Düzgün</th>
                <th className="px-4 py-3.5 font-medium">Bal</th>
                <th className="px-4 py-3.5 font-medium">Vaxt</th>
                <th className="px-6 py-3.5 font-medium">Tarix</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-mono font-medium text-slate-900">
                    {r.fin}
                  </td>
                  <td className="px-4 py-4 text-slate-700">{r.examTitle}</td>
                  <td className="px-4 py-4 text-slate-700">
                    {r.correctCount}/{r.total}
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`font-semibold ${
                        r.score >= 50 ? "text-[#4a1c2c]" : "text-red-600"
                      }`}
                    >
                      {r.score}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-slate-700 tabular-nums">
                    {Math.floor(r.timeSpentSec / 60)}:
                    {String(r.timeSpentSec % 60).padStart(2, "0")}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-slate-500">
                    {formatDateTime(r.finishedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
