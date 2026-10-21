"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, ClipboardList, Plus } from "lucide-react";
import {
  getExams,
  getResults,
  initStore,
  getSession,
} from "@/lib/store";
import { examStatus, formatDateTime } from "@/lib/helpers";
import type { Exam, ExamResult } from "@/lib/types";

export default function AdminDashboardPage() {
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

  const stats = useMemo(() => {
    const activeCount = exams.filter((e) => examStatus(e) === "active").length;
    const avg =
      results.length > 0
        ? Math.round(results.reduce((acc, r) => acc + r.score, 0) / results.length)
        : null;
    return {
      activeCount,
      participants: results.length,
      avg,
    };
  }, [exams, results]);

  const recentResults = useMemo(
    () =>
      [...results]
        .sort((a, b) => b.finishedAt.localeCompare(a.finishedAt))
        .slice(0, 5),
    [results],
  );

  return (
    <div className="space-y-6">
      {/* Səhifə başlığı */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">İdarəetmə Paneli</h1>
          <p className="text-sm text-slate-500">
            Sistemin demosu — məlumatlar brauzer yaddaşında saxlanılır.
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

      {/* Statistika */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          label="Açıq imtahanlar"
          value={String(stats.activeCount)}
          accent
        />
        <StatCard label="Ümumi imtahan" value={String(exams.length)} />
        <StatCard label="İştirakçı (nəticə)" value={String(stats.participants)} />
        <StatCard
          label="Orta nəticə"
          value={stats.avg === null ? "—" : `${stats.avg}%`}
        />
      </div>

      {/* Son nəticələr */}
      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <ClipboardList className="size-4 text-[#4a1c2c]" />
            <h2 className="text-sm font-semibold text-slate-900">Son nəticələr</h2>
          </div>
          <Link
            href="/account/results"
            className="inline-flex items-center gap-1 text-xs font-medium text-[#4a1c2c] hover:underline underline-offset-4"
          >
            Bütün nəticələr
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
        {recentResults.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-slate-500">
            Hələ imtahan nəticəsi yoxdur.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {recentResults.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-1 px-6 py-3.5 text-sm hover:bg-slate-50"
              >
                <span className="w-24 font-mono font-medium text-slate-900">
                  {r.fin}
                </span>
                <span className="min-w-0 flex-1 truncate text-slate-700">
                  {r.examTitle}
                </span>
                <span
                  className={`font-semibold ${
                    r.score >= 50 ? "text-[#4a1c2c]" : "text-red-600"
                  }`}
                >
                  {r.score}
                </span>
                <span className="w-36 text-right text-xs text-slate-400">
                  {formatDateTime(r.finishedAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border px-5 py-4 shadow-sm ${
        accent ? "border-[#4a1c2c]/20 bg-[#4a1c2c]/5" : "border-slate-200 bg-white"
      }`}
    >
      <p className="text-xs text-slate-500">{label}</p>
      <p
        className={`mt-1 text-2xl font-bold ${
          accent ? "text-[#4a1c2c]" : "text-slate-900"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

