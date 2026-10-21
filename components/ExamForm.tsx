"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Exam, Question } from "@/lib/types";
import { newId, saveExam } from "@/lib/store";
import { formatDateTimeLocal } from "@/lib/helpers";

export type ExamFormMode = "create" | "edit";

type EditorState = {
  title: string;
  subject: string;
  startsAt: string; // datetime-local format
  endsAt: string;
  durationMin: string;
  ticketCodes: string;
};

export default function ExamForm({ mode, exam }: { mode: ExamFormMode; exam?: Exam }) {
  const router = useRouter();

  const [state, setState] = useState<EditorState>(() => ({
    title: exam?.title ?? "",
    subject: exam?.subject ?? "",
    startsAt: exam ? formatDateTimeLocal(exam.startsAt) : "",
    endsAt: exam ? formatDateTimeLocal(exam.endsAt) : "",
    durationMin: String(exam?.durationMin ?? 20),
    ticketCodes: exam?.ticketCodes.join(", ") ?? "",
  }));

  const [questions, setQuestions] = useState<Question[]>(
    exam?.questions.length
      ? exam.questions.map((q) => ({ ...q, options: [...q.options] }))
      : [blankQuestion()],
  );

  const [errors, setErrors] = useState<string[]>([]);

  // Yaratma rejimində tarix sahələrini tayıntıdan sonra doldur (prerender-də Date.now() yasaqlıdır)
  useEffect(() => {
    if (exam) return;
    const t = setTimeout(() => {
      const startsAt = new Date(Date.now() - 60 * 60 * 1000).toISOString(); // 1 saat əvvəl
      const endsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 1 həftə sonra
      setState((s) =>
        s.startsAt || s.endsAt
          ? s
          : { ...s, startsAt: formatDateTimeLocal(startsAt), endsAt: formatDateTimeLocal(endsAt) },
      );
    }, 0);
    return () => clearTimeout(t);
  }, [exam]);

  const setField = (k: keyof EditorState, v: string) =>
    setState((s) => ({ ...s, [k]: v }));

  const updateQuestion = (
    qid: string,
    patch: Partial<Pick<Question, "text" | "correct">> | { option: number; value: string },
  ) => {
    setQuestions((qs) =>
      qs.map((q) => {
        if (q.id !== qid) return q;
        if ("option" in patch) {
          const opts = [...q.options];
          opts[patch.option] = patch.value;
          return { ...q, options: opts };
        }
        return { ...q, ...patch };
      }),
    );
  };

  const removeQuestion = (qid: string) => {
    setQuestions((qs) => (qs.length > 1 ? qs.filter((q) => q.id !== qid) : qs));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: string[] = [];

    if (!state.title.trim()) errs.push("İmtahanın adı boşdur.");
    if (!state.subject.trim()) errs.push("Fənn boşdur.");
    if (!state.startsAt || !state.endsAt)
      errs.push("Başlanğıc və bitmə tarixini yazın.");
    if (state.startsAt && state.endsAt && state.startsAt >= state.endsAt)
      errs.push("Bitmə tarixi başlanğıc tarixindən sonra olmalıdır.");
    const duration = parseInt(state.durationMin, 10);
    if (!(duration >= 1 && duration <= 1000))
      errs.push("Müddət 1–1000 dəqiqə aralığında olmalıdır.");

    questions.forEach((q, i) => {
      if (!q.text.trim()) errs.push(`${i + 1}. sualın mətni boşdur.`);
      q.options.forEach((o, oi) => {
        if (!o.trim()) errs.push(`${i + 1}. sualın ${String.fromCharCode(65 + oi)} variantı boşdur.`);
      });
      if (!(q.correct >= 0 && q.correct < q.options.length))
        errs.push(`${i + 1}. sualda düzgün variant seçin.`);
    });

    setErrors(errs);
    if (errs.length > 0) return;

    const tickets = state.ticketCodes
      .split(/[,\s]+/)
      .map((t) => t.trim().toUpperCase())
      .filter(Boolean);

    const id = mode === "edit" && exam ? exam.id : newId();
    const isEdit = mode === "edit";

    saveExam(
      {
        id,
        title: state.title.trim(),
        subject: state.subject.trim(),
        startsAt: new Date(state.startsAt).toISOString(),
        endsAt: new Date(state.endsAt).toISOString(),
        durationMin: duration,
        ticketCodes: tickets,
        questions,
        createdAt: exam?.createdAt ?? new Date().toISOString(),
      },
      isEdit,
    );

    router.push("/account");
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      {errors.length > 0 && (
        <div className="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <ul className="list-disc list-inside space-y-1">
            {errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Ümumi məlumatlar */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
        <h3 className="font-semibold text-gray-900">Əsas məlumatlar</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="İmtahanın adı">
            <input
              value={state.title}
              onChange={(e) => setField("title", e.target.value)}
              placeholder="Məs: Riyaziyyat — Sınaq imtahanı №2"
              className={inputClass}
            />
          </Field>
          <Field label="Fənn">
            <input
              value={state.subject}
              onChange={(e) => setField("subject", e.target.value)}
              placeholder="Məs: Riyaziyyat"
              className={inputClass}
            />
          </Field>
          <Field label="Başlanğıc tarixi">
            <input
              type="datetime-local"
              value={state.startsAt}
              onChange={(e) => setField("startsAt", e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Bitmə tarixi">
            <input
              type="datetime-local"
              value={state.endsAt}
              onChange={(e) => setField("endsAt", e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Müddət (dəqiqə)">
            <input
              type="number"
              min={1}
              max={1000}
              value={state.durationMin}
              onChange={(e) => setField("durationMin", e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Bilet kodları (vergüllə ayırın — boş olsa istənilən kod qəbul edilir)">
            <input
              value={state.ticketCodes}
              onChange={(e) => setField("ticketCodes", e.target.value)}
              placeholder="Məs: 1234-5678, 8765-4321"
              className={inputClass}
            />
          </Field>
        </div>
        <p className="text-xs text-gray-500">
          İmtahan yalnız başlanğıc və bitmə tarixi aralığında şagirdlər üçün açıq
          olur. Bilet kodları sahəsi boş olarsa, istənilən keçərli formatlı kod
          qəbul edilir.
        </p>
      </div>

      {/* Suallar */}
      <div className="mt-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Suallar ({questions.length})</h3>
          <button
            type="button"
            onClick={() => setQuestions((qs) => [...qs, blankQuestion()])}
            className="px-3 py-1.5 rounded-md border border-gray-300 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            + Sual əlavə et
          </button>
        </div>

        {questions.map((q, qi) => (
          <div key={q.id} className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-gray-500">Sual {qi + 1}</span>
              <button
                type="button"
                onClick={() => removeQuestion(q.id)}
                disabled={questions.length <= 1}
                className="text-red-600 hover:underline text-sm font-medium disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Sil
              </button>
            </div>

            <Field label={`${qi + 1}. Sualın mətni`}>
              <textarea
                value={q.text}
                onChange={(e) => updateQuestion(q.id, { text: e.target.value })}
                rows={2}
                className={inputClass}
              />
            </Field>

            <div className="mt-4 space-y-2">
              <p className="text-xs font-medium text-gray-500">
                Cavab variantları (düzgünunu seçin):
              </p>
              {q.options.map((opt, oi) => (
                <label
                  key={oi}
                  className="flex items-center gap-3 cursor-pointer"
                >
                  <input
                    type="radio"
                    name={`correct-${q.id}`}
                    checked={q.correct === oi}
                    onChange={() => updateQuestion(q.id, { correct: oi })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-xs font-semibold text-gray-500 w-5">
                    {String.fromCharCode(65 + oi)})
                  </span>
                  <input
                    value={opt}
                    onChange={(e) => updateQuestion(q.id, { option: oi, value: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-center gap-3">
        <button
          type="submit"
          className="px-5 py-2.5 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          {mode === "create" ? "Yarat" : "Yadda saxla"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/account")}
          className="px-5 py-2.5 rounded-md border border-gray-300 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          Ləğv et
        </button>
      </div>
    </form>
  );
}

const inputClass =
  "w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="block text-sm font-medium text-gray-700 mb-1.5">{label}</p>
      {children}
    </div>
  );
}

function blankQuestion(): Question {
  // Deterministik id: SSR və hydration eyni sıranı alır (prerender-də
  // crypto.randomUUID() istifadə etmək olmur)
  return { id: `q-${++questionSeq}`, text: "", options: ["", "", "", ""], correct: 0 };
}

let questionSeq = 0;
