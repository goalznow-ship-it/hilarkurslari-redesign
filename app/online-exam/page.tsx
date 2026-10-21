"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Exam, ExamResult } from "@/lib/types";
import {
  clearEntry,
  getEntry,
  getExam,
  initStore,
  newId,
  saveResult,
} from "@/lib/store";
import { formatDuration } from "@/lib/helpers";

export default function OnlineExamPage() {
  const router = useRouter();
  const [exam, setExam] = useState<Exam | null>(null);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [current, setCurrent] = useState(0);
  const [remainSec, setRemainSec] = useState<number | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const submittedRef = useRef(false);
  const submitRef = useRef<(auto?: boolean) => void>(() => {});

  const submit = useCallback(
    (auto = false) => {
      if (submittedRef.current) return;
      submittedRef.current = true;
      setConfirmOpen(false);

      const entry = getEntry();
      const finishedAt = Date.now();
      const startedAt = entry?.startedAt ?? finishedAt;
      const timeSpentSec = Math.min(
        Math.max(Math.round((finishedAt - startedAt) / 1000), 0),
        (exam?.durationMin ?? 0) * 60,
      );

      const correctCount = (exam?.questions ?? []).reduce(
        (acc, q, i) => acc + (answers[i] === q.correct ? 1 : 0),
        0,
      );
      const total = exam?.questions.length ?? 0;
      const result: ExamResult = {
        id: newId(),
        examId: exam?.id ?? "",
        examTitle: exam?.title ?? "Bilinmir",
        fin: entry?.fin ?? "BƏLİRSİZ",
        ticketCode: entry?.ticket ?? "",
        answers,
        correctCount,
        total,
        score: total > 0 ? Math.round((correctCount / total) * 100) : 0,
        startedAt: new Date(startedAt).toISOString(),
        finishedAt: new Date(finishedAt).toISOString(),
        timeSpentSec,
      };
      saveResult(result);
      clearEntry();
      router.replace(`/online-exam/result?rid=${result.id}${auto ? "&auto=1" : ""}`);
    },
    [answers, exam, router],
  );

  // interval-loop'dan cavablandırma üçün yeni closure saxlayırıq
  useEffect(() => {
    submitRef.current = () => submit(true);
  }, [submit]);

  // İlk açılış: sessiya verisi və imtahanın yüklənməsi
  useEffect(() => {
    const t = setTimeout(() => {
      initStore();
      const entry = getEntry();
      const e = entry ? getExam(entry.examId) : undefined;
      if (!entry || !e) {
        router.replace("/");
        return;
      }
      setExam(e);
      setAnswers(new Array(e.questions.length).fill(null));
      setRemainSec(
        Math.max(
          0,
          Math.floor(entry.startedAt / 1000 + e.durationMin * 60 - Date.now() / 1000),
        ),
      );
      // vaxt artıq bitibsə — daxil olmadan nəticələndirilir
      if (Date.now() - entry.startedAt >= e.durationMin * 60 * 1000) {
        submittedRef.current = false;
        setTimeout(() => {
          // cavabların hamısı boş qalacaq (sual görünməmişdir)
          submitRef.current();
        }, 0);
      }
    }, 0);
    return () => clearTimeout(t);
  }, [router]);

  // Geri sayma — hər saniyə
  useEffect(() => {
    if (!exam) return;
    const t = setInterval(() => {
      setRemainSec((r) => {
        if (r === null) return r;
        if (r <= 1) {
          clearInterval(t);
          submitRef.current(); // vaxt bitdi — avtomatik göndər
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [exam]);

  if (!exam) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 text-gray-500">
        Yüklənir…
      </div>
    );
  }

  const q = exam.questions[current];
  const answeredCount = answers.filter((a) => a !== null).length;
  const low = (remainSec ?? 0) < 60;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white px-4 md:px-6 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs text-gray-500 truncate">{exam.subject}</p>
            <h1 className="text-sm md:text-base font-semibold text-gray-900 truncate">
              {exam.title}
            </h1>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs text-gray-500 hidden md:inline">
              {answeredCount}/{exam.questions.length} cavablandırılıb
            </span>
            <span
              className={`tabular-nums font-mono font-semibold px-3 py-1.5 rounded-md text-sm ${
                low ? "bg-red-100 text-red-700 animate-pulse" : "bg-blue-50 text-blue-700"
              }`}
            >
              {remainSec !== null ? formatDuration(remainSec) : "--:--"}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 md:px-6 py-6">
        <div className="grid md:grid-cols-[220px_1fr] gap-6">
          {/* Suallar naviqasiyası */}
          <aside className="order-2 md:order-1">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <p className="text-xs font-medium text-gray-500 mb-3">Suallar</p>
              <div className="grid grid-cols-8 md:grid-cols-5 gap-2">
                {exam.questions.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrent(i)}
                    className={`h-9 rounded-md text-sm font-medium transition-colors ${
                      i === current
                        ? "bg-blue-600 text-white"
                        : answers[i] !== null
                          ? "bg-green-100 text-green-800 hover:bg-green-200"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          {/* Aktiv sual */}
          <section className="order-1 md:order-2 bg-white border border-gray-200 rounded-lg p-6 md:p-8">
            <p className="text-sm text-gray-500 mb-2">
              Sual {current + 1} / {exam.questions.length}
            </p>
            <h2 className="text-lg font-semibold text-gray-900 mb-6">{q.text}</h2>

            <div className="space-y-3">
              {q.options.map((opt, i) => {
                const selected = answers[current] === i;
                return (
                  <button
                    type="button"
                    key={i}
                    onClick={() =>
                      setAnswers((a) => a.map((v, idx) => (idx === current ? i : v)))
                    }
                    className={`w-full text-left px-4 py-3 rounded-md border text-sm transition-colors ${
                      selected
                        ? "border-blue-600 bg-blue-50 text-blue-900 ring-1 ring-blue-600"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-800"
                    }`}
                  >
                    <span
                      className={`inline-flex h-6 w-6 items-center justify-center rounded-full mr-3 text-xs font-semibold ${
                        selected ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {String.fromCharCode(65 + i)}
                    </span>
                    {opt}
                  </button>
                );
              })}
            </div>

            <div className="mt-8 flex items-center justify-between gap-3">
              <button
                onClick={() => setCurrent((c) => Math.max(0, c - 1))}
                disabled={current === 0}
                className="px-4 py-2 rounded-md border border-gray-300 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ← Əvvəlki
              </button>
              {current < exam.questions.length - 1 ? (
                <button
                  onClick={() =>
                    setCurrent((c) => Math.min(exam.questions.length - 1, c + 1))
                  }
                  className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
                >
                  Sonrakı →
                </button>
              ) : (
                <button
                  onClick={() => setConfirmOpen(true)}
                  className="px-4 py-2 rounded-md bg-green-600 text-white text-sm font-medium hover:bg-green-700"
                >
                  İmtahanı bitir
                </button>
              )}
            </div>
          </section>
        </div>

        <button
          onClick={() => setConfirmOpen(true)}
          className="fixed bottom-6 right-6 md:hidden px-5 py-3 rounded-full bg-green-600 text-white text-sm font-medium shadow-lg"
        >
          Bitir
        </button>
      </main>

      {/* Yekunlaşdırma təsdiqi */}
      {confirmOpen && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">İmtahanı bitir?</h3>
            {answeredCount < exam.questions.length ? (
              <p className="text-sm text-red-600 mb-4">
                Diqqət! {exam.questions.length - answeredCount} sual cavabsızdır.
              </p>
            ) : (
              <p className="text-sm text-gray-600 mb-4">
                Bütün suallar cavablandırılıb. Təsdiq etdikdən sonra cavabları redaktə
                etmək mümkün deyil.
              </p>
            )}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmOpen(false)}
                className="px-4 py-2 rounded-md border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Davam et
              </button>
              <button
                onClick={() => submit(false)}
                className="px-4 py-2 rounded-md bg-green-600 text-white text-sm font-medium hover:bg-green-700"
              >
                Təsdiq — yekunlaşdır
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
