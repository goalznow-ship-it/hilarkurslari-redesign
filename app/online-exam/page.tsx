"use client";

import {
  useRef,
  useCallback,
  useEffect,
  useState
} from "react";
import { useRouter } from "next/navigation";
import type { Exam, ExamResult } from "@/lib/types";
import {
  clearEntry,
  getEntry,
  getExam,
  initStore,
  saveResult,
  getResults,
  scoreAnswer,
  getExamProgress,
  saveExamProgress,
} from "@/lib/store";
import { QuestionImage } from "@/components/QuestionMedia";
import { formatDuration } from "@/lib/helpers";

export default function OnlineExamPage() {
  const router = useRouter();
  const [exam, setExam] = useState<Exam | null>(null);
  const [answers, setAnswers] = useState<Array<number | number[] | null>>([]);
  const [current, setCurrent] = useState(0);
  const [remainSec, setRemainSec] = useState<number | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const examRef = useRef<Exam | null>(null);
  const answersRef = useRef<Array<number | number[] | null>>([]);
  const submittingRef = useRef(false);
  const autoAttemptedRef = useRef(false);
  const deadlineRef = useRef(0);

  const submit = useCallback((auto = false) => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setIsSubmitting(true);
    setError(null);
    try {
      const entry = getEntry();
      const e = examRef.current;
      if (!entry || !e || entry.examId !== e.id) {
        router.replace("/");
        return;
      }
      const existing = getResults().find(
        (r) => r.examId === entry.examId && r.fin.trim().toUpperCase() === entry.fin.trim().toUpperCase(),
      );
      if (existing) {
        clearEntry();
        router.replace(`/online-exam/result?rid=${existing.id}`);
        return;
      }
      const finishedAt = Date.now();
      const submittedAnswers = answersRef.current;
      let correctCount = 0;
      let totalPoints = 0;
      let earnedPoints = 0;
      e.questions.forEach((q, i) => {
        const scored = scoreAnswer(q, submittedAnswers[i] ?? null);
        if (scored.isCorrect) correctCount++;
        totalPoints += q.points ?? 1;
        earnedPoints += scored.earnedPoints;
      });
      const result: ExamResult = {
        id: `result-${e.id}-${finishedAt}`,
        examId: e.id,
        companyId: e.companyId,
        academicYear: e.academicYear,
        examTitle: e.title,
        fin: entry.fin,
        ticketCode: entry.ticket,
        answers: submittedAnswers,
        questions: e.questions,
        correctCount,
        total: e.questions.length,
        score: totalPoints > 0 ? Math.round(earnedPoints / totalPoints * 100) : 0,
        startedAt: new Date(entry.startedAt).toISOString(),
        finishedAt: new Date(finishedAt).toISOString(),
        timeSpentSec: Math.max(0, Math.round((Math.min(finishedAt, deadlineRef.current) - entry.startedAt) / 1000)),
      };
      saveResult(result);
      clearEntry();
      router.replace(`/online-exam/result?rid=${result.id}${auto ? "&auto=1" : ""}`);
    } catch {
      setError("Nəticə saxlanılmadı. Yenidən təsdiq edin.");
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }, [router]);

  useEffect(() => {
    const t = setTimeout(() => {
      try {
        initStore();
        const entry = getEntry();
        const e = entry ? getExam(entry.examId) : undefined;
        if (!entry || !e || !e.onlineEnabled || !e.questions.length ||
          !Number.isFinite(entry.startedAt) || !Number.isFinite(Date.parse(e.startsAt)) ||
          !Number.isFinite(Date.parse(e.endsAt)) || Date.parse(e.startsAt) > Date.now()) {
          router.replace("/");
          return;
        }
        const progress = getExamProgress();
        const sameAttempt = progress?.examId === entry.examId && progress.fin === entry.fin && progress.startedAt === entry.startedAt;
        const restored = sameAttempt ? progress.answers : [];
        const loadedAnswers = e.questions.map((_, i) => restored[i] ?? null);
        answersRef.current = loadedAnswers;
        examRef.current = e;
        deadlineRef.current = Math.min(entry.startedAt + e.durationMin * 60_000, Date.parse(e.endsAt));
        setAnswers(loadedAnswers);
        setCurrent(sameAttempt && Number.isInteger(progress.current) && progress.current >= 0 && progress.current < e.questions.length ? progress.current : 0);
        setRemainSec(Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000)));
        setExam(e);
      } catch {
        setError("İmtahan yüklənmədi. Səhifəni yeniləyin.");
      }
    }, 0);
    return () => clearTimeout(t);
  }, [router]);

  useEffect(() => {
    if (!exam) return;
    const t = setTimeout(() => {
      try {
        const entry = getEntry();
        if (entry?.examId === exam.id) saveExamProgress({ ...entry, answers, current });
      } catch {
        setError("Cavablar saxlanılmadı. Səhifəni bağlamayın.");
      }
    }, 0);
    return () => clearTimeout(t);
  }, [exam, answers, current]);

  useEffect(() => {
    if (!exam) return;
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000));
      setRemainSec(remaining);
      if (remaining === 0 && !autoAttemptedRef.current) {
        autoAttemptedRef.current = true;
        submit(true);
      }
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [exam, submit]);

  if (!exam) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-neutral-50 text-neutral-500">
        {error ?? "Yüklənir…"}
      </div>
    );
  }

  const q = exam.questions[current];
  const answeredCount = answers.filter((a) => a !== null && (!Array.isArray(a) || a.length > 0)).length;
  const low = (remainSec ?? 0) < 60;

  return (
    <div className="min-h-[100dvh] bg-neutral-50">
      <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white px-4 md:px-6 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs text-neutral-500 truncate">{exam.subject}</p>
            <h1 className="text-sm md:text-base font-semibold text-neutral-900 truncate">
              {exam.title}
            </h1>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs text-neutral-500 hidden md:inline">
              {answeredCount}/{exam.questions.length} cavablandırılıb
            </span>
            <span
              className={`tabular-nums font-mono font-semibold px-3 py-1.5 rounded-md text-sm ${
                low ? "bg-danger-soft text-danger-fg" : "bg-neutral-100 text-neutral-800"
              }`}
            >
              {remainSec !== null ? formatDuration(remainSec) : "--:--"}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 md:px-6 py-6">
        {error && <p role="alert" className="mb-4 text-sm text-danger-fg">{error}</p>}
        <div className="grid md:grid-cols-[220px_1fr] gap-6">
          {/* Suallar naviqasiyası */}
          <aside className="order-2 md:order-1">
            <div className="bg-white border border-neutral-200 rounded-lg p-4">
              <p className="text-xs font-medium text-neutral-500 mb-3">Suallar</p>
              <div className="grid grid-cols-8 md:grid-cols-5 gap-2">
                {exam.questions.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrent(i)}
                    className={`h-9 rounded-md text-sm font-medium transition-colors ${
                      i === current
                        ? "bg-info text-white"
                        : answers[i] !== null && (!Array.isArray(answers[i]) || answers[i].length > 0)
                          ? "bg-success-soft text-success-fg hover:bg-success-soft"
                          : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          {/* Aktiv sual */}
          <section className="order-1 md:order-2 bg-white border border-neutral-200 rounded-lg p-6 md:p-8">
            <p className="text-sm text-neutral-500 mb-2">
              Sual {current + 1} / {exam.questions.length}
            </p>
            <h2 className="whitespace-pre-wrap text-lg font-semibold text-neutral-900 mb-6">{q.text}</h2>

            <QuestionImage image={q.image} />
            <div className="space-y-3">
              {q.options.map((opt, i) => {
                const isMultiple = q.type === "multiple";
                const selected = isMultiple
                  ? (Array.isArray(answers[current]) ? answers[current].includes(i) : false)
                  : answers[current] === i;
                return (
                  <button
                    type="button"
                    key={i}
                    aria-pressed={selected}
                    disabled={isSubmitting || remainSec === 0}
                    onClick={() =>
                      setAnswers((a) => {
                        const newAnswers = [...a];
                        if (isMultiple) {
                          const currentSelection = Array.isArray(newAnswers[current]) ? [...newAnswers[current]] : [];
                          if (currentSelection.includes(i)) {
                            newAnswers[current] = currentSelection.filter((idx) => idx !== i);
                          } else {
                            newAnswers[current] = [...currentSelection, i];
                          }
                        } else {
                          newAnswers[current] = i;
                        }
                        answersRef.current = newAnswers;
                        return newAnswers;
                      })
                    }
                    className={`w-full rounded-md border px-4 py-3 text-left text-sm transition-colors duration-150 ${
                      selected
                        ? "border-brand-600 bg-brand-50 text-brand-900 ring-1 ring-brand-600"
                        : "border-neutral-200 text-neutral-800 hover:border-neutral-300 hover:bg-neutral-50"
                    }`}
                  >
                    <span
                      className={`inline-flex h-6 w-6 items-center justify-center rounded-full mr-3 text-xs font-semibold ${
                        selected ? "bg-brand-700 text-white" : "bg-neutral-100 text-neutral-600"
                      }`}
                    >
                      {isMultiple
                        ? selected
                          ? "✓"
                          : ""
                        : String.fromCharCode(65 + i)}
                    </span>
                    <span className="whitespace-pre-wrap">{opt}</span><QuestionImage image={q.optionImages?.[i]} />
                  </button>
                );
              })}
            </div>

            <div className="mt-8 flex items-center justify-between gap-3">
              <button
                onClick={() => setCurrent((c) => Math.max(0, c - 1))}
                disabled={current === 0}
                className="px-4 py-2 rounded-md border border-neutral-300 text-sm font-medium text-neutral-700 bg-white hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ← Əvvəlki
              </button>
              {current < exam.questions.length - 1 ? (
                <button
                  onClick={() =>
                    setCurrent((c) => Math.min(exam.questions.length - 1, c + 1))
                  }
                  className="rounded-md bg-brand-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-800"
                >
                  Sonrakı →
                </button>
              ) : (
                <button
                  onClick={() => setConfirmOpen(true)}
                  className="rounded-md bg-success px-4 py-2 text-sm font-medium text-white transition-colors hover:brightness-95"
                >
                  İmtahanı bitir
                </button>
              )}
            </div>
          </section>
        </div>

        <button
          onClick={() => setConfirmOpen(true)}
          className="fixed right-6 bottom-6 rounded-full bg-success px-5 py-3 text-sm font-medium text-white shadow-md md:hidden"
        >
          Bitir
        </button>
      </main>

      {/* Yekunlaşdırma təsdiqi */}
      {confirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/40 p-4 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
        >
          <div className="w-full max-w-sm rounded-lg border border-neutral-200 bg-white p-6 shadow-lg">
            <h3
              id="confirm-title"
              className="mb-2 text-base font-semibold text-neutral-900"
            >
              İmtahanı bitir?
            </h3>
            {answeredCount < exam.questions.length ? (
              <p className="mb-4 text-sm text-danger-fg">
                Diqqət! {exam.questions.length - answeredCount} sual cavabsızdır.
              </p>
            ) : (
              <p className="mb-4 text-sm text-neutral-600">
                Bütün suallar cavablandırılıb. Təsdiq etdikdən sonra cavabları redaktə
                etmək mümkün deyil.
              </p>
            )}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmOpen(false)}
                className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
              >
                Davam et
              </button>
              <button
                onClick={() => submit(false)}
                className="rounded-md bg-success px-4 py-2 text-sm font-medium text-white transition-colors hover:brightness-95"
                disabled={isSubmitting}
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