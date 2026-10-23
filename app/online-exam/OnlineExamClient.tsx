"use client";

import {
  useRef,
  useCallback,
  useEffect,
  useState
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Exam } from "@/lib/types";
import { QuestionImage } from "@/components/QuestionMedia";
import { formatDuration } from "@/lib/helpers";
import { saveAnswer, submitExam, getAttempt } from "@/lib/api-client";

export default function OnlineExamClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const attemptIdFromUrl = searchParams.get("attemptId");
  const [exam, setExam] = useState<Pick<Exam,"id"|"title"|"subject"|"durationMin"> & {questions:Array<Omit<Exam["questions"][number],"correct">>} | null>(null);
  const [answers, setAnswers] = useState<Array<number | number[] | null>>([]);
  const [current, setCurrent] = useState(0);
  const [remainSec, setRemainSec] = useState<number | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const attemptId = attemptIdFromUrl;
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  const answersRef = useRef<Array<number | number[] | null>>([]);
  const revisionRef=useRef("");
  const saveQueue=useRef<Promise<void>>(Promise.resolve());
  const [saveError,setSaveError]=useState("");
  const submittingRef = useRef(false);
  const autoAttemptedRef = useRef(false);

  const submit = useCallback(async (auto = false) => {
    if (submittingRef.current || !attemptId) return;
    submittingRef.current = true;
    setIsSubmitting(true);
    setError(null);
    try {
      await saveQueue.current;
      const submittedAnswers = answersRef.current;
      const result = await submitExam(attemptId, submittedAnswers,revisionRef.current);
      router.replace(`/online-exam/result?token=${result.accessToken}${auto ? "&auto=1" : ""}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nəticə saxlanılmadı. Yenidən təsdiq edin.");
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }, [attemptId, router]);

  useEffect(() => {
    const loadExam = async () => {
      if (!attemptId) {
        router.replace("/");
        return;
      }
      try {
        const data=await getAttempt(attemptId);
        revisionRef.current=data.revision;
        setExam(data.exam); setExpiresAt(data.expiresAt); setAnswers(data.answers); answersRef.current=data.answers;
        setError(null);
      } catch {
        setError("İmtahan yüklənmədi. Səhifəni yeniləyin.");
      } finally {
        setLoading(false);
      }
    };
    loadExam();
  }, [attemptId, router]);

  const queueSave=useCallback((values:Array<number|number[]|null>)=>{
    if(!attemptId||submittingRef.current)return;
    saveQueue.current=saveQueue.current.then(async()=>{
      if(submittingRef.current)return;
      try{const saved=await saveAnswer(attemptId,values,revisionRef.current);revisionRef.current=saved.revision;setSaveError("");}
      catch{setSaveError("Cavablar saxlanılmadı. Başqa pəncərəni bağlayın və ya əlaqəni bərpa edib yenidən cəhd edin.");}
    });
  },[attemptId]);
  useEffect(()=>{if(!exam)return;const timeout=setTimeout(()=>queueSave(answers),500);return()=>clearTimeout(timeout);},[exam,answers,queueSave]);
  useEffect(()=>{const retry=()=>queueSave(answersRef.current);window.addEventListener("online",retry);return()=>window.removeEventListener("online",retry);},[queueSave]);

  useEffect(() => {
    if (!exam || !expiresAt) return;
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 1000));
      setRemainSec(remaining);
      if (remaining === 0 && !autoAttemptedRef.current) {
        autoAttemptedRef.current = true;
        submit(true);
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [exam, expiresAt, submit]);

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-neutral-50 text-neutral-500">
        {error ?? "Yüklənir…"}
      </div>
    );
  }

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
        {saveError && <p role="alert" className="mb-4 text-sm text-danger-fg">{saveError} <button className="underline" onClick={()=>queueSave(answersRef.current)}>Yenidən saxla</button></p>}
        {error && <p role="alert" className="mb-4 text-sm text-danger-fg">{error}</p>}
        <div className="grid md:grid-cols-[220px_1fr] gap-6">
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
                    <span className="whitespace-pre-wrap">{opt}</span>
                    <QuestionImage image={q.optionImages?.[i]} />
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