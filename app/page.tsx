"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { Exam } from "@/lib/types";
import {
  findResultByParticipant,
  getExams,
  initStore,
  setEntry,
} from "@/lib/store";
import { examStatus, isValidFin, isValidTicket, normalizeFin, normalizeTicket } from "@/lib/helpers";

export default function Home() {
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

  const activeExams = useMemo(() => exams ?? [], [exams]);
  const selectedExam = activeExams.find((e) => e.id === examId) ?? null;

  const handleFinChange = (v: string) => {
    setFin(v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 7));
  };

  const handleTicketChange = (v: string) => {
    setTicket(normalizeTicket(v));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

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
    <div className="min-h-screen bg-gray-50 font-sans antialiased">
      <nav className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center gap-3">
          <img src="/logo.svg" alt="Kitabça Sistemi" className="h-9 w-9 rounded-lg" />
          <h1 className="text-xl font-bold text-gray-900">Kitabça Sistemi</h1>
        </div>
        <a
          href="/account/login"
          className="hidden md:inline-block px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors text-sm font-medium"
        >
          Panel Girişi
        </a>
      </nav>

      <main className="max-w-4xl mx-auto py-12 px-4">
        <div className="bg-white rounded-lg p-8 md:p-10 max-w-2xl mx-auto border border-gray-200 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">3 addımda imtahana giriş</h2>
          <p className="mb-6 text-gray-500">
            Yalnız hazırda açıq olan imtahanlar sizə göstərilir.
          </p>

          <form onSubmit={handleSubmit} noValidate>
            <div className="space-y-4">
              {/* Step 1: Select exam */}
              <div>
                <label htmlFor="exam" className="block text-sm font-medium text-gray-700 mb-2">
                  1. İmtahanı seçin
                </label>
                <select
                  id="exam"
                  value={examId}
                  onChange={(e) => setExamId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 focus outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="" disabled>
                    {activeExams.length === 0
                      ? "Hazırda açıq imtahan yoxdur"
                      : "İmtahan seçin"}
                  </option>
                  {activeExams.map((ex) => (
                    <option key={ex.id} value={ex.id}>
                      {ex.title} ({ex.durationMin} dəq)
                    </option>
                  ))}
                </select>
              </div>

              {/* Step 2: FIN code */}
              <div>
                <label htmlFor="fin" className="block text-sm font-medium text-gray-700 mb-2">
                  2. FİN kodunuzu yazın
                </label>
                <input
                  id="fin"
                  type="text"
                  value={fin}
                  onChange={(e) => handleFinChange(e.target.value)}
                  placeholder="Şəxsiyyət vəsiqənizdəki 7 simvol"
                  maxLength={7}
                  autoComplete="off"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md uppercase tracking-widest focus outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Step 3: Ticket code */}
              <div>
                <label htmlFor="ticket" className="block text-sm font-medium text-gray-700 mb-2">
                  3. Bilet kodunu daxil edin
                </label>
                <input
                  id="ticket"
                  type="text"
                  value={ticket}
                  onChange={(e) => handleTicketChange(e.target.value)}
                  placeholder="XXXX-XXXX"
                  maxLength={9}
                  autoComplete="off"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md uppercase tracking-widest focus outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {error && (
              <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}{" "}
                {existingResultId && (
                  <a
                    href={`/online-exam/result?rid=${existingResultId}`}
                    className="font-medium underline underline-offset-2"
                  >
                    Nəticəyə bax
                  </a>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={exams === null}
              className="w-full mt-6 py-3 px-4 font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              İmtahana daxil ol
            </button>
          </form>
        </div>

        <p className="mt-6 max-w-2xl mx-auto text-center text-xs text-gray-400">
          Demo versiya: məlumatlar brauzer yaddaşında saxlanılır. Bilet kodu
          XXXX-XXXX formatında istənilən kod qəbul edilir (admin tərəfdən qeyd
          olunmadıqda).
        </p>
      </main>
    </div>
  );
}
