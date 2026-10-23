"use client";

import { useRouter } from "next/navigation";
import { use, useEffect, useMemo, useState } from "react";
import { request, refreshAdminState, getExams, getResults, initStore, getSession } from "@/lib/backend-store";
import { formatDateTime } from "@/lib/helpers";
import type { Exam, ExamResult } from "@/lib/types";

export default function ResultsClient({
  searchParams,
}: {
  searchParams: Promise<{ examId?: string }>;
}) {
  const router = useRouter();
  const [finalizing,setFinalizing]=useState(false);
  const [feedback,setFeedback]=useState("");
  const [finalizeError,setFinalizeError]=useState("");
  const finalize=async()=>{if(finalizing)return;setFinalizing(true);setFeedback("");setFinalizeError("");try{const result=await request<{finalized:number;failed:number}>("/api/attempts/finalize-expired","POST",{});await refreshAdminState();setResults(getResults());setFeedback(`${result.finalized} vaxtı bitmiş cəhd yekunlaşdı.`);if(result.failed)setFinalizeError(`${result.failed} cəhd əl ilə yoxlanmalıdır; əvvəlki məlumatlar qorundu.`);}catch(error){setFinalizeError(error instanceof Error?error.message:"Yekunlaşdırılmadı.");}finally{setFinalizing(false);}};
  const params = use(searchParams);

  const [exams, setExams] = useState<Exam[]>([]);
  const [results, setResults] = useState<ExamResult[]>([]);
  // URL-dəki filtr (examId) — istifadəçi seçim dəyişəndə onu üstün tutur
  const [manualExamId, setManualExamId] = useState<string | null>(null);

  useEffect(() => {
    if (!getSession()) {
      router.replace("/admin/login");
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
      <div className="flex flex-wrap items-center gap-3"><button type="button" disabled={finalizing} onClick={finalize} className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-brand-700 disabled:opacity-50">{finalizing?"Yekunlaşdırılır…":"Vaxtı bitən cəhdləri yekunlaşdır"}</button>{feedback&&<p role="status" className="text-sm">{feedback}</p>}{finalizeError&&<p role="alert" className="text-sm text-danger-fg">{finalizeError}</p>}</div>
      {/* Səhifə başlığı */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Nəticələr</h1>
          <p className="text-sm text-neutral-500">
            {activeExam
              ? `${activeExam.title} — bütün nəticələr.`
              : "Bütün imtahan nəticələri — şagird, bal və vaxt üzrə."}
          </p>
        </div>
        <select
          value={filterExamId}
          onChange={(e) => setManualExamId(e.target.value)}
          className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-700 outline-none focus:border-brand-700 focus:ring-2 focus:ring-brand-700/30"
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
        <div className="rounded-lg border border-neutral-200 bg-white p-10 text-center shadow-xs">
          <p className="text-sm text-neutral-500">Bu filtr üzrə nəticə yoxdur.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-xs">
          {/* Mobil: kart görünüşü */}
          <ul className="divide-y divide-neutral-100 md:hidden">
            {filtered.map((r) => (
              <li key={r.id} className="px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-mono text-sm font-semibold text-neutral-900">
                    {r.fin}
                  </p>
                  <span
                    className={`tnum text-sm font-semibold ${
                      r.score >= 50 ? "text-brand-700" : "text-danger-fg"
                    }`}
                  >
                    {r.score}
                  </span>
                </div>
                <p className="mt-1 text-sm text-neutral-700">{r.examTitle}</p>
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                  <dt className="text-neutral-500">Düzgün cavab</dt>
                  <dd className="tnum text-neutral-800">
                    {r.correctCount}/{r.total}
                  </dd>
                  <dt className="text-neutral-500">Vaxt</dt>
                  <dd className="tnum text-neutral-800">
                    {Math.floor(r.timeSpentSec / 60)}:
                    {String(r.timeSpentSec % 60).padStart(2, "0")}
                  </dd>
                  <dt className="text-neutral-500">Tarix</dt>
                  <dd className="text-neutral-800">
                    {formatDateTime(r.finishedAt)}
                  </dd>
                </dl>
              </li>
            ))}
          </ul>

          {/* Desktop: cədvəl */}
          <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-xs text-neutral-500">
                <th className="px-6 py-3 font-medium">FİN</th>
                <th className="px-4 py-3 font-medium">İmtahan</th>
                <th className="px-4 py-3 font-medium">Düzgün</th>
                <th className="px-4 py-3 font-medium">Bal</th>
                <th className="px-4 py-3 font-medium">Vaxt</th>
                <th className="px-6 py-3 font-medium">Tarix</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filtered.map((r) => (
                <tr key={r.id} className="hover:bg-neutral-50">
                  <td className="px-6 py-4 font-mono font-medium text-neutral-900">
                    {r.fin}
                  </td>
                  <td className="px-4 py-4 text-neutral-700">{r.examTitle}</td>
                  <td className="tnum px-4 py-4 text-neutral-700">
                    {r.correctCount}/{r.total}
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`tnum font-semibold ${
                        r.score >= 50 ? "text-brand-700" : "text-danger-fg"
                      }`}
                    >
                      {r.score}
                    </span>
                  </td>
                  <td className="tnum px-4 py-4 text-neutral-700">
                    {Math.floor(r.timeSpentSec / 60)}:
                    {String(r.timeSpentSec % 60).padStart(2, "0")}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-neutral-500">
                    {formatDateTime(r.finishedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  );
}
