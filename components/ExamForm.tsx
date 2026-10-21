"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bookmark,
  BookOpen,
  Plus,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";

import {
  addQuestionToBank,
  getQuestionBank,
  newId,
  saveExam,
} from "@/lib/store";
import { formatDateTimeLocal } from "@/lib/helpers";
import type { Exam, Question } from "@/lib/types";

export type ExamFormMode = "create" | "edit";

type EditorState = {
  title: string;
  subject: string;
  startsAt: string;
  endsAt: string;
  durationMin: string;
  ticketCodes: string;
};

let questionSeq = 0;
function blankQuestion(): Question {
  return { id: `q-${++questionSeq}`, text: "", options: ["", "", "", ""], correct: 0 };
}

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
  const [bankOpen, setBankOpen] = useState(false);
  const [selectedBankIds, setSelectedBankIds] = useState<string[]>([]);
  const [bankQuestions, setBankQuestions] = useState<Question[]>([]);

  // Yaratma rejimində tarix sahələrini default dəyərlərlə doldur
  useEffect(() => {
    if (exam) return;
    const t = setTimeout(() => {
      const startsAt = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const endsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      setState((s) =>
        s.startsAt || s.endsAt
          ? s
          : {
              ...s,
              startsAt: formatDateTimeLocal(startsAt),
              endsAt: formatDateTimeLocal(endsAt),
            },
      );
    }, 0);
    return () => clearTimeout(t);
  }, [exam]);

  // Sual bankını yüklə (dialog açılanda yenilənir)
  useEffect(() => {
    if (!bankOpen) return;
    const t = setTimeout(() => {
      setBankQuestions(getQuestionBank());
    }, 0);
    return () => clearTimeout(t);
  }, [bankOpen]);

  const setField = (k: keyof EditorState, v: string) =>
    setState((s) => ({ ...s, [k]: v }));

  const updateQuestionText = (qid: string, text: string) =>
    setQuestions((qs) =>
      qs.map((q) => (q.id === qid ? { ...q, text } : q)),
    );

  const updateOption = (qid: string, oi: number, value: string) =>
    setQuestions((qs) =>
      qs.map((q) => {
        if (q.id !== qid) return q;
        const opts = [...q.options];
        opts[oi] = value;
        return { ...q, options: opts };
      }),
    );

  const updateCorrect = (qid: string, correct: number) =>
    setQuestions((qs) =>
      qs.map((q) => (q.id === qid ? { ...q, correct } : q)),
    );

  const removeQuestion = (qid: string) =>
    setQuestions((qs) =>
      qs.length > 1 ? qs.filter((q) => q.id !== qid) : qs,
    );

  const addBankQuestion = (q: Question) => {
    addQuestionToBank(q);
    setBankQuestions(getQuestionBank());
  };

  const handleAddSelected = () => {
    const selected = bankQuestions.filter((q) =>
      selectedBankIds.includes(q.id),
    );
    if (selected.length === 0) return;
    setQuestions((qs) => [
      ...qs,
      ...selected.map((q) => ({
        id: newId(),
        text: q.text,
        options: [...q.options],
        correct: q.correct,
      })),
    ]);
    setSelectedBankIds([]);
    setBankOpen(false);
  };

  const toggleBankSelection = (id: string) =>
    setSelectedBankIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
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
        if (!o.trim())
          errs.push(`${i + 1}. sualın ${String.fromCharCode(65 + oi)} variantı boşdur.`);
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

    router.push("/account/exams");
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      {errors.length > 0 && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <ul className="list-disc list-inside space-y-1">
            {errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* ===== Əsas məlumatlar ===== */}
      <Card className="rounded-xl border-slate-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-base text-[#4a1c2c]">
            Əsas məlumatlar
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="title">İmtahanın adı</Label>
            <Input
              id="title"
              value={state.title}
              onChange={(e) => setField("title", e.target.value)}
              placeholder="Məs: Riyaziyyat — Sınaq imtahanı №2"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="subject">Fənn</Label>
            <Input
              id="subject"
              value={state.subject}
              onChange={(e) => setField("subject", e.target.value)}
              placeholder="Məs: Riyaziyyat"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="startsAt">Başlanğıc tarixi</Label>
              <Input
                id="startsAt"
                type="datetime-local"
                value={state.startsAt}
                onChange={(e) => setField("startsAt", e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="endsAt">Bitmə tarixi</Label>
              <Input
                id="endsAt"
                type="datetime-local"
                value={state.endsAt}
                onChange={(e) => setField("endsAt", e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="duration">Müddət (dəqiqə)</Label>
              <Input
                id="duration"
                type="number"
                min={1}
                max={1000}
                value={state.durationMin}
                onChange={(e) => setField("durationMin", e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tickets">Bilet kodları</Label>
              <Input
                id="tickets"
                value={state.ticketCodes}
                onChange={(e) => setField("ticketCodes", e.target.value)}
                placeholder="1234-5678, 8765-4321 (boş = istənilən)"
              />
            </div>
          </div>
          <p className="text-xs text-slate-500">
            İmtahan yalnız başlanğıc və bitmə tarixi aralığında şagirdlər üçün
            açıq olur. Bilet kodları sahəsi boş olarsa, istənilən keçərli
            formatlı kod qəbul edilir.
          </p>
        </CardContent>
      </Card>

      {/* ===== Suallar ===== */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-slate-900">
            Suallar ({questions.length})
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setQuestions((qs) => [...qs, blankQuestion()])}
              className="gap-1.5"
            >
              <Plus className="size-4" />
              Sual əlavə et
            </Button>

            <Dialog open={bankOpen} onOpenChange={setBankOpen}>
              <DialogTrigger asChild>
                <Button type="button" variant="outline" className="gap-1.5">
                  <BookOpen className="size-4" />
                  Sual Bankından Seç
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Sual Bankı</DialogTitle>
                  <DialogDescription>
                    Əvvəlcədən yaradılmış sualları seçin və imtahana əlavə edin.
                  </DialogDescription>
                </DialogHeader>

                {bankQuestions.length === 0 ? (
                  <p className="py-6 text-center text-sm text-slate-500">
                    Sual bankı boşdur. Sual kartındakı bookmark ikonu ilə sualları
                    banka əlavə edə bilərsiniz.
                  </p>
                ) : (
                  <div className="max-h-[50vh] space-y-3 overflow-y-auto pr-1">
                    {bankQuestions.map((q) => {
                      const checked = selectedBankIds.includes(q.id);
                      return (
                        <label
                          key={q.id}
                          className={`flex cursor-pointer gap-3 rounded-lg border p-3 transition-colors ${
                            checked
                              ? "border-[#4a1c2c]/40 bg-[#4a1c2c]/5"
                              : "border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() => toggleBankSelection(q.id)}
                            className="mt-0.5"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-slate-900">
                              {q.text || "— mətnsiz sual —"}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {q.options.map((o, i) => (
                                <span key={i} className="mr-2">
                                  {String.fromCharCode(65 + i)}) {o}
                                </span>
                              ))}
                            </p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setBankOpen(false)}
                  >
                    Bağla
                  </Button>
                  <Button
                    type="button"
                    onClick={handleAddSelected}
                    disabled={selectedBankIds.length === 0}
                    className="bg-[#4a1c2c] hover:bg-[#381420] text-white"
                  >
                    Seçilmişləri əlavə et ({selectedBankIds.length})
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {questions.map((q, qi) => (
          <Card
            key={q.id}
            className="relative rounded-xl border-slate-200 bg-white shadow-sm"
          >
            <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-3">
              <CardTitle className="text-sm font-semibold text-[#4a1c2c]">
                Sual {qi + 1}
              </CardTitle>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => addBankQuestion(q)}
                  title="Sualı banka əlavə et"
                  className="text-slate-400 hover:text-[#4a1c2c]"
                >
                  <Bookmark className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeQuestion(q.id)}
                  disabled={questions.length <= 1}
                  title="Sualı sil"
                  className="text-slate-400 hover:text-red-600"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor={`q-text-${q.id}`}>Sualın mətni</Label>
                <Textarea
                  id={`q-text-${q.id}`}
                  value={q.text}
                  onChange={(e) => updateQuestionText(q.id, e.target.value)}
                  rows={3}
                  placeholder="Sualı buraya yazın…"
                />
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-slate-500">
                  Cavab variantları (düzgününü seçin):
                </p>
                <RadioGroup
                  value={String(q.correct)}
                  onValueChange={(v) => updateCorrect(q.id, parseInt(v, 10))}
                  className="gap-2"
                >
                  {q.options.map((opt, oi) => (
                    <div
                      key={oi}
                      className="flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50/50 px-3 py-2"
                    >
                      <RadioGroupItem
                        value={String(oi)}
                        id={`q-${q.id}-opt-${oi}`}
                      />
                      <span className="w-5 text-xs font-semibold text-slate-500">
                        {String.fromCharCode(65 + oi)}
                      </span>
                      <Input
                        value={opt}
                        onChange={(e) => updateOption(q.id, oi, e.target.value)}
                        placeholder={`Variant ${String.fromCharCode(65 + oi)}`}
                        className="flex-1 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                      />
                    </div>
                  ))}
                </RadioGroup>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ===== Sticky yadda saxlama düyməsi ===== */}
      <div className="sticky bottom-4 z-20 flex justify-end pt-2">
        <Button
          type="submit"
          className="gap-2 bg-[#4a1c2c] hover:bg-[#381420] text-white shadow-lg"
        >
          Yadda Saxla və Dərc Et
        </Button>
      </div>
    </form>
  );
}
