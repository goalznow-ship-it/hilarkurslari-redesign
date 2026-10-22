"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import type { Exam, ExamResult } from "@/lib/types";
import { getExam, initStore, getResult, scoreAnswer } from "@/lib/store";
import { QuestionImage } from "@/components/QuestionMedia";
import { formatDateTime, formatDuration } from "@/lib/helpers";

function ResultContent() {
  const searchParams = useSearchParams();
  const rid = searchParams.get("rid");
  const auto = searchParams.get("auto") === "1";

  const [result, setResult] = useState<ExamResult | null | "loading">("loading");
  const [exam, setExam] = useState<Exam | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      initStore();
      const r = rid ? getResult(rid) ?? null : null;
      setResult(r);
      setExam(r ? getExam(r.examId) ?? null : null);
    }, 0);
    return () => clearTimeout(t);
  }, [rid]);

  if (result === "loading") {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-neutral-50 text-neutral-500">
        Yüklənir…
      </div>
    );
  }

  if (!result) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-neutral-50 px-4">
        <div className="text-center">
          <p className="text-neutral-600 mb-4">Nəticə tapılmadı.</p>
          <Link
            href="/"
            className="px-4 py-2 rounded-md bg-info text-white text-sm font-medium hover:bg-info"
          >
            Ana səhifəyə qayıt
          </Link>
        </div>
      </div>
    );
  }

  const passed = result.score >= 50;

  return (
    <div className="min-h-[100dvh] bg-neutral-50">
      <main className="max-w-2xl mx-auto px-4 py-10">
        {auto && (
          <div className="mb-6 rounded-md border border-warning/25 bg-warning-soft px-4 py-3 text-sm text-warning-fg">
            Baxış vaxtı bitdiyi üçün imtahan avtomatik yekunlaşdırıldı.
          </div>
        )}

        <div className="bg-white border border-neutral-200 rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-neutral-200 text-center">
            <p className="text-sm text-neutral-500">Sizin nəticə</p>
            <p
              className={`text-xl font-bold mt-2 ${
                passed ? "text-success-fg" : "text-danger-fg"
              }`}
            >
              {result.score}
              <span className="text-xl text-neutral-400"> /100</span>
            </p>
            <p className="mt-2 text-sm font-medium text-neutral-700">{result.examTitle}</p>
          </div>

          <dl className="grid grid-cols-2 gap-px bg-neutral-100 text-sm">
            <div className="bg-white px-6 py-4">
              <dt className="text-neutral-500 text-xs">FİN kod</dt>
              <dd className="mt-1 font-mono font-semibold text-neutral-900">{result.fin}</dd>
            </div>
            <div className="bg-white px-6 py-4">
              <dt className="text-neutral-500 text-xs">Bilet kodu</dt>
              <dd className="mt-1 font-mono font-semibold text-neutral-900">
                {result.ticketCode}
              </dd>
            </div>
            <div className="bg-white px-6 py-4">
              <dt className="text-neutral-500 text-xs">Düzgün cavab</dt>
              <dd className="mt-1 font-semibold text-neutral-900">
                {result.correctCount} / {result.total}
              </dd>
            </div>
            <div className="bg-white px-6 py-4">
              <dt className="text-neutral-500 text-xs">Sərf etdiyiniz vaxt</dt>
              <dd className="mt-1 font-semibold text-neutral-900 tabular-nums">
                {formatDuration(result.timeSpentSec)}
              </dd>
            </div>
            <div className="bg-white px-6 py-4">
              <dt className="text-neutral-500 text-xs">Başlama vaxtı</dt>
              <dd className="mt-1 text-neutral-900">{formatDateTime(result.startedAt)}</dd>
            </div>
            <div className="bg-white px-6 py-4">
              <dt className="text-neutral-500 text-xs">Bitirmə vaxtı</dt>
              <dd className="mt-1 text-neutral-900">{formatDateTime(result.finishedAt)}</dd>
            </div>
          </dl>
        </div>

        {/* Sualların təhlili */}
        <h2 className="mt-8 mb-4 text-lg font-semibold text-neutral-900">Sualların təhlili</h2>
        <div className="space-y-3">
          {result.answers.map((given, i) => {
            const q = (result.questions ?? exam?.questions)?.[i];
            const scoreResult = q ? scoreAnswer(q, given) : { isCorrect: false, earnedPoints: 0 };
            const isCorrect = scoreResult.isCorrect;
            return (
              <div
                key={i}
                className={`rounded-md border px-4 py-3 text-sm ${
                  isCorrect ? "border-success/25 bg-success-soft" : "border-danger/25 bg-danger-soft"
                }`}
              >
                {q ? (
                  <>
                    <p className="font-medium text-neutral-900">
                      {i + 1}. {q.text}
                    </p>
                    <QuestionImage image={q.image} />
                    <div className="space-y-2">{q.options.map((option, index) => q.optionImages?.[index] ? <div key={index}><p className="text-sm">{String.fromCharCode(65 + index)}) {option}</p><QuestionImage image={q.optionImages[index]} /></div> : null)}</div>
                    {q.explanation && <p className="mt-2 text-sm text-neutral-600">İzah: {q.explanation}</p>}
                    <p className="mt-1 text-neutral-700">
                      Cavabınız:{" "}
                      <span className="font-medium">
                        {given !== null
                          ? (Array.isArray(given)
                              ? given.map((g) => `${String.fromCharCode(65 + g)}) ${q.options[g]}`).join(", ")
                              : `${String.fromCharCode(65 + given)}) ${q.options[given]}`)
                          : "— cavabsız"}
                      </span>
                    </p>
                    {!isCorrect && (
                      <p className="mt-0.5 text-success-fg">
                        Düzgün cavab:{" "}
                        <span className="font-medium">
                          {Array.isArray(q.correct)
                            ? q.correct.map((c, idx) => (idx > 0 ? ", " : "") + String.fromCharCode(65 + c) + ") " + q.options[c]).join("")
                            : String.fromCharCode(65 + q.correct) + ") " + q.options[q.correct]}
                        </span>
                      </p>
                    )}
                  </>
                ) : (
                  <span className="text-neutral-800">
                    Sual {i + 1}:{" "}
                    <span className="font-medium">
                      {isCorrect ? "Düzgün" : given === null ? "Cavabsız" : "Səhv"}
                    </span>
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}

export default function ResultPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[100dvh] items-center justify-center bg-neutral-50 text-neutral-500">
          Yüklənir…
        </div>
      }
    >
      <ResultContent />
    </Suspense>
  );
}
