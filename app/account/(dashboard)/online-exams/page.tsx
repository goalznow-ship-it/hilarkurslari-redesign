"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  CircleOff,
  FileBarChart,
  Lock,
  Search,
  Settings2,
  Ticket,
  Wifi,
} from "lucide-react";

import { getExams, getResults, getSession, initStore } from "@/lib/store";
import { examStatus, formatDateTime } from "@/lib/helpers";
import type { Exam, ExamResult } from "@/lib/types";

import {
  Card,
  CardContent,
  Input,
} from "@/components/ui";

type OnlineState = "active" | "planned" | "ended" | "not_setup";

export default function OnlineExamsPage() {
  const router = useRouter();
  const [exams, setExams] = useState<Exam[]>([]);
  const [results, setResults] = useState<ExamResult[]>([]);
  const [search, setSearch] = useState("");

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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return exams;
    return exams.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        (e.code ?? "").toLowerCase().includes(q),
    );
  }, [exams, search]);

  const resultCount = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of results) {
      map.set(r.examId, (map.get(r.examId) ?? 0) + 1);
    }
    return map;
  }, [results]);

  return (
    <div className="space-y-6">
      {/* ===== Səhifə başlığı ===== */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-neutral-900">Onlayn İmtahanlar</h1>
          <p className="mt-1 max-w-2xl text-sm text-neutral-500">
            İmtahanı onlayn rejimdə aktivləşdirin, bilet satın və nəticələri
            izləyin. Şagird girişi /online-exam ünvanından FIN + bilet kodu ilə.
          </p>
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="İmtahan adı və ya kodu..."
            aria-label="İmtahan axtar"
            className="w-64 pl-9"
          />
        </div>
      </div>

      {/* ===== Cədvəl ===== */}
      <Card className="gap-0 rounded-xl border-neutral-200 bg-white py-0 shadow-sm">
        <CardContent className="px-0 py-0">
          {filtered.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <span className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-neutral-100">
                <Wifi className="size-6 text-neutral-400" />
              </span>
              <p className="text-sm font-medium text-neutral-700">
                {exams.length === 0
                  ? "Hələ imtahan yoxdur"
                  : "Axtarışa uyğun imtahan tapılmadı"}
              </p>
              {exams.length === 0 && (
                <p className="mt-1 text-xs text-neutral-500">
                  Onlayn rejimdə idarə etmək üçün əvvəlcə imtahan yaradın.
                </p>
              )}
              {exams.length === 0 && (
                <Link
                  href="/account/exams/new"
                  className="mt-5 inline-flex items-center gap-2 rounded-md bg-brand-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-800"
                >
                  Yeni İmtahan
                </Link>
              )}
            </div>
          ) : (
            <>
              {/* Mobil: kart görünüşü */}
              <ul className="divide-y divide-neutral-100 md:hidden">
                {filtered.map((exam) => {
                  const state = getOnlineState(exam);
                  return (
                    <li key={exam.id} className="px-4 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-neutral-900">
                            {exam.title}
                          </p>
                          <p className="mt-0.5 font-mono text-xs text-neutral-400">
                            {exam.code ?? "—"}
                          </p>
                        </div>
                        <OnlineBadge state={state} />
                      </div>
                      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                        <dt className="text-neutral-500">Sinif</dt>
                        <dd className="truncate text-neutral-800">
                          {getClassBlock(exam)}
                        </dd>
                        <dt className="text-neutral-500">Bilet</dt>
                        <dd className="tnum text-neutral-800">
                          {exam.ticketCodes.length}
                        </dd>
                        <dt className="text-neutral-500">Bitirən</dt>
                        <dd className="tnum text-neutral-800">
                          {resultCount.get(exam.id) ?? 0}
                        </dd>
                      </dl>
                      {exam.onlineEnabled && (
                        <p className="mt-2 text-xs text-neutral-500">
                          {formatDateTime(exam.startsAt)} —{" "}
                          {formatDateTime(exam.endsAt)}
                        </p>
                      )}
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <Link
                          href={`/account/exams/${exam.id}`}
                          className="inline-flex items-center gap-1.5 rounded-md bg-brand-700 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-brand-800"
                        >
                          <Settings2 className="size-3.5" />
                          İdarə et
                        </Link>
                        <button
                          type="button"
                          onClick={() =>
                            alert("Tezliklə — biletlər bölməsi hazırlanır.")
                          }
                          className="inline-flex items-center gap-1.5 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
                        >
                          <Ticket className="size-3.5" />
                          Biletlər
                        </button>
                        <Link
                          href={`/account/results?examId=${exam.id}`}
                          className="inline-flex items-center gap-1.5 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
                        >
                          <FileBarChart className="size-3.5" />
                          Nəticələr
                        </Link>
                      </div>
                    </li>
                  );
                })}
              </ul>

              {/* Desktop: cədvəl */}
              <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[1000px] text-sm">
                <thead>
                  <tr className="border-b border-neutral-100 text-left text-xs text-neutral-500">
                    <th className="px-6 py-3.5 font-medium">İmtahan</th>
                    <th className="px-4 py-3.5 font-medium">Sinif</th>
                    <th className="px-4 py-3.5 font-medium">Onlayn vəziyyət</th>
                    <th className="px-4 py-3.5 font-medium">Giriş pəncərəsi</th>
                    <th className="px-4 py-3.5 font-medium">Bilet</th>
                    <th className="px-4 py-3.5 font-medium">Bitirən</th>
                    <th className="px-6 py-3.5 text-right font-medium">
                      Əməliyyat
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {filtered.map((exam) => {
                    const state = getOnlineState(exam);
                    return (
                      <tr key={exam.id} className="hover:bg-neutral-50">
                        {/* İmtahan */}
                        <td className="px-6 py-4">
                          <p className="font-semibold text-neutral-900">
                            {exam.title}
                          </p>
                          <p className="mt-0.5 font-mono text-xs text-neutral-400">
                            {exam.code ?? "—"}
                          </p>
                        </td>

                        {/* Sinif */}
                        <td className="px-4 py-4 text-neutral-700">
                          {getClassBlock(exam)}
                        </td>

                        {/* Onlayn vəziyyət */}
                        <td className="px-4 py-4">
                          <OnlineBadge state={state} />
                        </td>

                        {/* Giriş pəncərəsi */}
                        <td className="px-4 py-4">
                          {exam.onlineEnabled ? (
                            <div className="text-xs leading-relaxed text-neutral-600">
                              <p className="tabular-nums">
                                Başlanğıc: {formatDateTime(exam.startsAt)}
                              </p>
                              <p className="tabular-nums">
                                Bitmə: {formatDateTime(exam.endsAt)}
                              </p>
                            </div>
                          ) : (
                            <span className="text-neutral-400">—</span>
                          )}
                        </td>

                        {/* Bilet */}
                        <td className="px-4 py-4 text-neutral-700 tabular-nums">
                          {exam.ticketCodes.length}
                        </td>

                        {/* Bitirən */}
                        <td className="px-4 py-4 text-neutral-700 tabular-nums">
                          {resultCount.get(exam.id) ?? 0}
                        </td>

                        {/* Əməliyyat */}
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                            <Link
                              href={`/account/exams/${exam.id}`}
                              className="inline-flex items-center gap-1.5 rounded-md bg-brand-700 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-brand-800"
                            >
                              <Settings2 className="size-3.5" />
                              İdarə et
                            </Link>
                            <button
                              type="button"
                              onClick={() =>
                                alert("Tezliklə — biletlər bölməsi hazırlanır.")
                              }
                              className="inline-flex items-center gap-1.5 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
                            >
                              <Ticket className="size-3.5" />
                              Biletlər
                            </button>
                            <Link
                              href={`/account/results?examId=${exam.id}`}
                              className="inline-flex items-center gap-1.5 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
                            >
                              <FileBarChart className="size-3.5" />
                              Nəticələr
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Yardımçılar                                                              */
/* -------------------------------------------------------------------------- */

function getOnlineState(exam: Exam): OnlineState {
  if (!exam.onlineEnabled) return "not_setup";
  const status = examStatus(exam);
  if (status === "active") return "active";
  if (status === "ended") return "ended";
  return "planned";
}

function getClassBlock(exam: Exam): string {
  const parts = [exam.grade, exam.block].filter(Boolean);
  return parts.length > 0 ? parts.join(" – ") : exam.subject;
}

function OnlineBadge({ state }: { state: OnlineState }) {
  if (state === "active") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
        <Activity className="size-3.5" />
        Aktiv
      </span>
    );
  }
  if (state === "ended") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-danger-soft px-2.5 py-0.5 text-xs font-medium text-danger-fg">
        <Lock className="size-3.5" />
        Bağlıdır
      </span>
    );
  }
  if (state === "planned") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-warning-soft px-2.5 py-0.5 text-xs font-medium text-warning-fg">
        <Activity className="size-3.5" />
        Gözləmədə
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-600">
      <CircleOff className="size-3.5" />
      Qurulmayıb
    </span>
  );
}
