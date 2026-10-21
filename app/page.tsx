"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, BookOpen, Info, Lock, User } from "lucide-react";

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import {
  findResultByParticipant,
  getExams,
  initStore,
  setEntry,
} from "@/lib/store";
import {
  examStatus,
  isValidFin,
  isValidTicket,
  normalizeFin,
  normalizeTicket,
} from "@/lib/helpers";
import type { Exam } from "@/lib/types";

export default function ExamEntryPage() {
  const router = useRouter();
  const [exams, setExams] = useState<Exam[] | null>(null);
  const [examId, setExamId] = useState("");
  const [fin, setFin] = useState("");
  const [ticket, setTicket] = useState("");
  const [error, setError] = useState("");
  const [existingResultId, setExistingResultId] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      initStore();
      setExams(getExams().filter((e) => examStatus(e) === "active"));
    }, 0);
    return () => clearTimeout(t);
  }, []);

  // FİN: yalnız böyük hərf + rəqəm, maks. 7 simvol
  const handleFinChange = (value: string) => {
    setFin(value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 7));
  };

  // Bilet: yalnız böyük hərf + rəqəm, XXXX-XXXX maskesi
  const handleTicketChange = (value: string) => {
    setTicket(normalizeTicket(value));
  };

  const selectedExam = exams?.find((e) => e.id === examId) ?? null;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setExistingResultId(null);

    if (!selectedExam) {
      setError("Zəhmət olmasa, imtahan seçin.");
      return;
    }
    if (!isValidFin(fin)) {
      setError("FİN kod dəqiq 7 simvol olmalıdır (hərf və ya rəqəm).");
      return;
    }
    if (!isValidTicket(ticket)) {
      setError("Bilet kodu XXXX-XXXX formatında olmalıdır.");
      return;
    }

    const finNorm = normalizeFin(fin);
    const ticketNorm = normalizeTicket(ticket);

    // Bilet kodu imtahanda qeyd olunubsa — uyğunluq yoxlanılır
    if (
      selectedExam.ticketCodes.length > 0 &&
      !selectedExam.ticketCodes.some((c) => c.toUpperCase() === ticketNorm)
    ) {
      setError("Bu bilet kodu seçilmiş imtahan üçün qeyd olunmayıb.");
      return;
    }

    // Bu FİN ilə imtahan artıq icra edilib?
    const existing = findResultByParticipant(selectedExam.id, finNorm);
    if (existing) {
      setError("Bu FİN kodu ilə imtahan artıq yekunlaşdırılıb.");
      setExistingResultId(existing.id);
      return;
    }

    setEntry({
      examId: selectedExam.id,
      fin: finNorm,
      ticket: ticketNorm,
      startedAt: Date.now(),
    });
    router.push("/online-exam");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4 py-10">
      {/* Brend loqosu */}
      <Image
        src="/hilal-logo.png"
        alt="Hilal Kursları"
        width={200}
        height={63}
        priority
        className="w-[180px] md:w-[200px] h-auto mb-8"
      />

      <Card className="w-full max-w-md shadow-lg rounded-xl">
        <CardHeader>
          <CardTitle className="text-[#4a1c2c]">İmtahana Giriş</CardTitle>
          <CardDescription>
            Yalnız hazırda açıq olan imtahanlar sizə göstərilir.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
            {/* 1. İmtahan seçimi */}
            <div className="grid gap-2">
              <Label htmlFor="exam" className="text-[#4a1c2c]">
                <BookOpen className="h-3.5 w-3.5" />
                İmtahanı seçin
              </Label>
              <Select value={examId} onValueChange={setExamId} disabled={exams === null}>
                <SelectTrigger id="exam" className="w-full">
                  <SelectValue
                    placeholder={
                      exams === null
                        ? "Yüklənir…"
                        : (exams ?? []).length === 0
                          ? "Hazırda açıq imtahan yoxdur"
                          : "İmtahan seçin"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {(exams ?? []).map((exam) => (
                    <SelectItem key={exam.id} value={exam.id}>
                      {exam.title} ({exam.durationMin} dəq)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 2. FİN kod */}
            <div className="grid gap-2">
              <Label htmlFor="fin" className="text-[#4a1c2c]">
                <User className="h-3.5 w-3.5" />
                FİN kod
              </Label>
              <Input
                id="fin"
                type="text"
                inputMode="text"
                maxLength={7}
                autoComplete="off"
                placeholder="Şəxsiyyət vəsiqənizdəki 7 simvollu FİN kod"
                value={fin}
                onChange={(e) => handleFinChange(e.target.value)}
                className="w-full uppercase tracking-widest bg-white"
              />
            </div>

            {/* 3. Bilet kodu */}
            <div className="grid gap-2">
              <Label htmlFor="ticket" className="text-[#4a1c2c]">
                <Lock className="h-3.5 w-3.5" />
                Bilet kodu
              </Label>
              <Input
                id="ticket"
                type="text"
                maxLength={9}
                autoComplete="off"
                placeholder="XXXX-XXXX"
                value={ticket}
                onChange={(e) => handleTicketChange(e.target.value)}
                className="w-full uppercase tracking-widest bg-white"
              />
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {error}{" "}
                {existingResultId && (
                  <Link
                    href={`/online-exam/result?rid=${existingResultId}`}
                    className="font-medium underline underline-offset-2"
                  >
                    Nəticəyə bax
                  </Link>
                )}
              </div>
            )}

            {/* Giriş düyməsi */}
            <Button
              type="submit"
              className="w-full bg-[#4a1c2c] hover:bg-[#381420] text-white h-11 text-base"
              disabled={exams === null}
            >
              İmtahana daxil ol
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>
        </CardContent>

        <CardFooter>
          <div className="flex items-start gap-2 rounded-md border border-[#4a1c2c]/10 bg-[#4a1c2c]/5 px-3 py-2.5 text-xs text-muted-foreground w-full">
            <Info className="h-3.5 w-3.5 mt-0.5 shrink-0 text-[#4a1c2c]/60" />
            <p className="leading-relaxed">
              Demo versiya: məlumatlar brauzer yaddaşında saxlanılır. Bilet kodu
              XXXX-XXXX formatında istənilən kod qəbul edilir (admin tərəfindən
              qeyd olunmadıqda).
            </p>
          </div>
        </CardFooter>
      </Card>

      {/* Panel girişi */}
      <Link
        href="/account/login"
        className="mt-6 text-sm text-muted-foreground hover:text-[#4a1c2c] underline-offset-4 hover:underline transition-colors"
      >
        Panel Girişi
      </Link>
    </div>
  );
}
