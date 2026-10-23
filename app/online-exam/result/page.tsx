"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import type { ExamResult } from "@/lib/types";
import { getResultByToken } from "@/lib/api-client";
import { QuestionImage } from "@/components/QuestionMedia";
import { formatDateTime, formatDuration } from "@/lib/helpers";

function ResultContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const auto = searchParams.get("auto") === "1";

  const [result, setResult] = useState<ExamResult | null | "loading">(token ? "loading" : null);

  useEffect(() => {
    if (!token) {
      return;
    }
    let cancelled = false;
    const loadResult = async () => {
      try {
        const data = await getResultByToken(token);
        if (!cancelled) {
          setResult(data);
        }
      } catch  {
        if (!cancelled) {
          setResult(null);
        }
      }
    };
    loadResult();
    return () => { cancelled = true; };
  }, [token]);

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
          {result.analysis?.map((item, i) => (
            <div
              key={i}
              className={`rounded-md border px-4 py-3 text-sm ${
                item.isCorrect ? "border-success/25 bg-success-soft" : "border-danger/25 bg-danger-soft"
              }`}
            >
              <p className="font-medium text-neutral-900">
                {i + 1}. {item.questionText}
              </p>
              {item.image && <QuestionImage image={item.image} />}
              <div className="space-y-2">{item.options.map((option, index) => item.optionImages?.[index] ? <div key={index}><p className="text-sm">{String.fromCharCode(65 + index)}) {option}</p><QuestionImage image={item.optionImages[index]} /></div> : null)}</div>
              {item.explanation && <p className="mt-2 text-sm text-neutral-600">İzah: {item.explanation}</p>}
              <p className="mt-1 text-neutral-700">
                Cavabınız:{" "}
                <span className="font-medium">
                  {item.given !== null
                    ? (Array.isArray(item.given)
                        ? item.given.map((g) => `${String.fromCharCode(65 + g)}) ${item.options[g]}`).join(", ")
                        : `${String.fromCharCode(65 + item.given)}) ${item.options[item.given]}`)
                    : "— cavabsız"}
                </span>
              </p>

            </div>
          ))}
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