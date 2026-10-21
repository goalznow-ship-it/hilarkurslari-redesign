"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { Exam, ExamResult } from "@/lib/types";
import {
  clearSession,
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

export default function AdminDashboardPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [exams, setExams] = useState<Exam[]>([]);
  const [results, setResults] = useState<ExamResult[]>([]);
  const [filterExamId, setFilterExamId] = useState("all");

  useEffect(() => {
    if (!getSession()) {
      router.replace("/account/login");
      return;
    }
    const t = setTimeout(() => {
      initStore();
      setExams(getExams());
      setResults(getResults());
      setReady(true);
    }, 0);
    return () => clearTimeout(t);
  }, [router]);

  const stats = useMemo(() => {
    const activeCount = exams.filter((e) => examStatus(e) === "active").length;
    const participants = results.length;
    const avg =
      participants > 0
        ? Math.round(results.reduce((acc, r) => acc + r.score, 0) / participants)
        : null;
    const totalQuestions = exams.reduce((acc, e) => acc + e.questions.length, 0);
    return { activeCount, participants, avg, totalQuestions };
  }, [exams, results]);

  const filteredResults = useMemo(
    () =>
      results
        .filter((r) => filterExamId === "all" || r.examId === filterExamId)
        .sort((a, b) => b.finishedAt.localeCompare(a.finishedAt)),
    [results, filterExamId],
  );

  const handleDelete = (ex: Exam) => {
    if (
      window.confirm(
        `"${ex.title}" imtahanı və ona aid bütün nəticələr silinəcək. Davam edilsin?`,
      )
    ) {
      deleteExam(ex.id);
      setExams(getExams());
      setResults(getResults());
    }
  };

  const handleLogout = () => {
    clearSession();
    router.push("/account/login");
  };

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 text-gray-500">
        Yüklənir…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="border-b border-gray-200 bg-white px-6 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="/logo.svg" alt="" className="h-8 w-8 rounded-lg" />
            <div>
              <h1 className="font-bold text-gray-900 leading-tight">Kitabça Sistemi</h1>
              <p className="text-xs text-gray-500 leading-tight">İdarə paneli</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/account/exams/new"
              className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
            >
              + Yeni imtahan
            </Link>
            <button
              onClick={handleLogout}
              className="px-4 py-2 rounded-md border border-gray-300 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Çıxış
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 md:px-6 py-8 space-y-8">
        {/* Statistika */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Açıq imtahanlar" value={stats.activeCount} />
          <StatCard label="Ümumi imtahan" value={exams.length} />
          <StatCard label="İştirakçı (nəticə)" value={stats.participants} />
          <StatCard label="Orta nəticə" value={stats.avg === null ? "—" : `${stats.avg}%`} />
        </div>

        {/* İmtahanlar */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">İmtahanlar</h2>
          {exams.length === 0 ? (
            <p className="text-sm text-gray-500 bg-white border border-gray-200 rounded-lg p-6 text-center">
              Hələ imtahan yaradılmayıb.{" "}
              <Link href="/account/exams/new" className="text-blue-600 hover:underline">
                Yeni imtahan yaradın
              </Link>
              .
            </p>
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 border-b border-gray-200">
                    <th className="px-4 py-3 font-medium">Ad</th>
                    <th className="px-4 py-3 font-medium">Müddət</th>
                    <th className="px-4 py-3 font-medium">Suallar</th>
                    <th className="px-4 py-3 font-medium">İştirakçı</th>
                    <th className="px-4 py-3 font-medium">Vəziyyət</th>
                    <th className="px-4 py-3 font-medium text-right">Əməliyyat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {exams.map((ex) => {
                    const status = examStatus(ex);
                    const partCount = results.filter((r) => r.examId === ex.id).length;
                    return (
                      <tr key={ex.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{ex.title}</p>
                          <p className="text-xs text-gray-500">{formatDateTime(ex.startsAt)} – {formatDateTime(ex.endsAt)}</p>
                        </td>
                        <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                          {ex.durationMin} dəq
                        </td>
                        <td className="px-4 py-3 text-gray-700">{ex.questions.length}</td>
                        <td className="px-4 py-3 text-gray-700">{partCount}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                              STATUS_STYLES[status]
                            }`}
                          >
                            {STATUS_LABELS[status]}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <Link
                            href={`/account/exams/${ex.id}`}
                            className="text-blue-600 hover:underline text-sm font-medium mr-3"
                          >
                            Redaktə
                          </Link>
                          <button
                            onClick={() => handleDelete(ex)}
                            className="text-red-600 hover:underline text-sm font-medium"
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
        </section>

        {/* Nəticələr */}
        <section>
          <div className="flex items-center justify-between gap-4 mb-3">
            <h2 className="text-lg font-semibold text-gray-900">Nəticələr</h2>
            <select
              value={filterExamId}
              onChange={(e) => setFilterExamId(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-md bg-white text-sm text-gray-700"
            >
              <option value="all">Bütün imtahanlar</option>
              {exams.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.title}
                </option>
              ))}
            </select>
          </div>
          {filteredResults.length === 0 ? (
            <p className="text-sm text-gray-500 bg-white border border-gray-200 rounded-lg p-6 text-center">
              Nəticə yoxdur.
            </p>
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 border-b border-gray-200">
                    <th className="px-4 py-3 font-medium">FİN</th>
                    <th className="px-4 py-3 font-medium">İmtahan</th>
                    <th className="px-4 py-3 font-medium">Düzgün</th>
                    <th className="px-4 py-3 font-medium">Bal</th>
                    <th className="px-4 py-3 font-medium">Vaxt</th>
                    <th className="px-4 py-3 font-medium">Tarix</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredResults.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono font-medium text-gray-900">
                        {r.fin}
                      </td>
                      <td className="px-4 py-3 text-gray-700">{r.examTitle}</td>
                      <td className="px-4 py-3 text-gray-700">
                        {r.correctCount}/{r.total}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`font-semibold ${
                            r.score >= 50 ? "text-green-700" : "text-red-700"
                          }`}
                        >
                          {r.score}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700 tabular-nums">
                        {Math.floor(r.timeSpentSec / 60)}:
                        {String(r.timeSpentSec % 60).padStart(2, "0")}
                      </td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        {formatDateTime(r.finishedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-5 py-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
