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

import { getExam, getExams, getResults, getSession, initStore, addTickets } from "@/lib/backend-store";
import { normalizeTicket } from "@/lib/helpers";
import { examStatus, formatDateTime } from "@/lib/helpers";
import type { Exam, ExamResult } from "@/lib/types";

import {
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
  Input,
} from "@/components/ui";
import { Button } from "@/components/ui";
import { useRef } from "react";

type OnlineState = "active" | "planned" | "ended" | "not_setup";

function getClassBlock(exam: Exam): string {
  const parts = [exam.grade, exam.block].filter(Boolean);
  return parts.length > 0 ? parts.join(" – ") : exam.subject;
}

function OnlineBadge({ state }: { state: OnlineState }) {
  if (state === "active") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-sm bg-success-soft px-2.5 py-0.5 text-xs font-medium text-success-fg">
        <Activity className="size-3.5" />
        Aktiv
      </span>
    );
  }
  if (state === "ended") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-sm bg-danger-soft px-2.5 py-0.5 text-xs font-medium text-danger-fg">
        <Lock className="size-3.5" />
        Bağlıdır
      </span>
    );
  }
  if (state === "planned") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-sm bg-warning-soft px-2.5 py-0.5 text-xs font-medium text-warning-fg">
        <Activity className="size-3.5" />
        Gözləmədə
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-sm bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-600">
      <CircleOff className="size-3.5" />
      Qurulmayıb
    </span>
  );
}

export default function OnlineExamsPage() {
  const router = useRouter();
  const [exams, setExams] = useState<Exam[]>([]);
  const [results, setResults] = useState<ExamResult[]>([]);
  const [search, setSearch] = useState("");

  const [ticketOpen, setTicketOpen] = useState(false);
  const [selectedExamForTickets, setSelectedExamForTickets] = useState<Exam | null>(
    null,
  );
  const [newTicketCodes, setNewTicketCodes] = useState<string>("");
  const [savingTickets, setSavingTickets] = useState(false);
  const ticketCodeInputRef = useRef<HTMLInputElement>(null);
  const [ticketError, setTicketError] = useState<string>("");
  const [ticketSuccess, setTicketSuccess] = useState<string>("");

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

  const getOnlineState = (exam: Exam): OnlineState => {
    if (!exam.onlineEnabled) return "not_setup";
    const status = examStatus(exam);
    if (status === "active") return "active";
    if (status === "ended") return "ended";
    return "planned";
  };

  const saveTickets = async () => {
    if (!selectedExamForTickets || !ticketCodeInputRef.current) return;
    const raw = ticketCodeInputRef.current.value.trim();

    // Clear previous messages at start of new operation
    setTicketError("");
    setTicketSuccess("");

    // Reject empty input (including comma-only)
    if (!raw) {
      setSavingTickets(false);
      setTicketError("Bilet kodlarını daxil edin.");
      return;
    }

    setSavingTickets(true);

    const codes = raw
      .split(",")
      .map((c) => c.trim())
      .filter((c) => c.length > 0);

    // After filtering empty strings, check if anything valid remains
    if (codes.length === 0) {
      setSavingTickets(false);
      setTicketError("Bilet kodlarını daxil edin.");
      return;
    }

    const ticketRegex = /^[A-Z0-9]{4}-[A-Z0-9]{4}$/;
    const malformed = codes.filter((code) => !ticketRegex.test(code.toUpperCase()));
    if (malformed.length > 0) {
      setSavingTickets(false);
      setTicketError("Yanlış bilet kodu formatı. Düzgün format: XXXX-XXXX.");
      return;
    }

    // Normalize all submitted codes for consistent comparison
    const normalizedSubmitted = codes
      .filter((code) => ticketRegex.test(code.toUpperCase()))
      .map((code) => normalizeTicket(code));

    // Check for duplicates WITHIN the submitted input itself (case-insensitive)
    const seen = new Set<string>();
    for (const code of normalizedSubmitted) {
      if (seen.has(code.toUpperCase())) {
        setSavingTickets(false);
        setTicketError("Təkrarlanan bilet kodları aşkarlandı.");
        return;
      }
      seen.add(code.toUpperCase());
    }

    // Re-read latest exam from store by ID to avoid stale data
    initStore();
    const latestExam = getExam(selectedExamForTickets.id);
    if (!latestExam) {
      setSavingTickets(false);
      setTicketError("İmtahan tapılmadı. Səhifəni yeniləyib yenidən cəhd edin.");
      return;
    }

    // Check for codes that already exist on this exam (case-insensitive)
    const existingCodes = latestExam.ticketCodes || [];
    const normalizedExisting = existingCodes.map((c) => c.toUpperCase());
    const alreadyExisting = normalizedSubmitted.filter((code) =>
      normalizedExisting.includes(code.toUpperCase())
    );

    if (alreadyExisting.length > 0) {
      setSavingTickets(false);
      setTicketError("Bu bilet kodları artıq mövcuddur.");
      return;
    }

    // The server appends to the current record atomically; never send a stale full exam.
    let result;
    try {
      result = await addTickets(latestExam.id, normalizedSubmitted);
    } catch {
      setSavingTickets(false);
      setTicketError("Məlumat bazası yazılarkən xəta baş verdi. Yenidən cəhd edin.");
      return;
    }

    if (!result.success) {
      setSavingTickets(false);
      setTicketError(result.error ?? "Bilet kodları saxlanılarkən xəta baş verdi.");
      return;
    }

    // Refresh the selected exam from store to update dialog with saved data
    initStore();
    const updatedExam = getExam(selectedExamForTickets.id);
    if (updatedExam) {
      setSelectedExamForTickets(updatedExam);
    }

    setSavingTickets(false);
    // Keep dialog open to show success message
    setNewTicketCodes("");
    setTicketSuccess("Bilet kodları uğurla saxlanıldı.");

    initStore();
    setExams(getExams());

    if (ticketCodeInputRef.current) {
      ticketCodeInputRef.current.focus();
    }
  };
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

  return (
    <div className="space-y-6">
      <div className="page-heading flex flex-wrap items-end justify-between gap-5">
        <div>
          <h1 className="text-xl font-bold text-neutral-900">Onlayn İmtahanlar</h1>
          <p className="mt-1 max-w-2xl text-sm text-neutral-500">
            İmtahanı onlayn rejimdə aktivləşdirin, biletləri və nəticələri
            izləyin. Şagird girişi /online-exam ünvanından FIN + bilet kodu ilə.
          </p>
        </div>

        <div className="relative w-full sm:w-auto">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-500" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="İmtahan adı və ya kodu..."
            aria-label="İmtahan axtar"
            className="w-full pl-9 sm:w-72"
          />
        </div>
      </div>

      <Card className="gap-0 rounded-xl border-neutral-200 bg-white py-0 shadow-sm">
        <CardContent className="px-0 py-0">
          {filtered.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <span className="mx-auto mb-4 flex size-14 items-center justify-center rounded-sm bg-neutral-100">
                <Wifi className="size-6 text-neutral-500" />
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
              <ul className="divide-y divide-neutral-100 xl:hidden">
                {filtered.map((exam) => {
                  const state = getOnlineState(exam);
                  return (
                    <li key={exam.id} className="px-4 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-neutral-900">
                            {exam.title}
                          </p>
                          <p className="mt-0.5 font-mono text-xs text-neutral-500">
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
                          className="inline-flex items-center gap-1.5 rounded-md bg-brand-50 px-3 py-2 text-xs font-medium text-brand-700 transition-colors hover:bg-brand-100"
                        >
                          <Settings2 className="size-3.5" />
                          İdarə et
                        </Link>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedExamForTickets(exam);
                            setTicketError("");
                            setTicketSuccess("");
                            setTicketOpen(true);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-md border border-neutral-300 bg-white px-3 py-2 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
                        >
                          <Ticket className="size-3.5" />
                          Biletlər
                        </button>
                        <Link
                          href={`/account/results?examId=${exam.id}`}
                          className="inline-flex items-center gap-1.5 rounded-md border border-neutral-300 bg-white px-3 py-2 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
                        >
                          <FileBarChart className="size-3.5" />
                          Nəticələr
                        </Link>
                      </div>
                    </li>
                  );
                })}
              </ul>

              <div className="hidden overflow-x-auto xl:block">
              <table className="w-full min-w-[980px] text-sm">
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
                        <td className="px-6 py-4">
                          <p className="font-semibold text-neutral-900">
                            {exam.title}
                          </p>
                          <p className="mt-0.5 font-mono text-xs text-neutral-500">
                            {exam.code ?? "—"}
                          </p>
                        </td>

                        <td className="px-4 py-4 text-neutral-700">
                          {getClassBlock(exam)}
                        </td>

                        <td className="px-4 py-4">
                          <OnlineBadge state={state} />
                        </td>

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
                            <span className="text-neutral-500">—</span>
                          )}
                        </td>

                        <td className="px-4 py-4 text-neutral-700 tabular-nums">
                          {exam.ticketCodes.length}
                        </td>

                        <td className="px-4 py-4 text-neutral-700 tabular-nums">
                          {resultCount.get(exam.id) ?? 0}
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                            <Link
                              href={`/account/exams/${exam.id}`}
                              className="inline-flex items-center gap-1.5 rounded-md bg-brand-50 px-3 py-2 text-xs font-medium text-brand-700 transition-colors hover:bg-brand-100"
                            >
                              <Settings2 className="size-3.5" />
                              İdarə et
                            </Link>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedExamForTickets(exam);
                                setTicketError("");
                                setTicketSuccess("");
                                setTicketOpen(true);
                              }}
                              className="inline-flex items-center gap-1.5 rounded-md border border-neutral-300 bg-white px-3 py-2 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
                            >
                              <Ticket className="size-3.5" />
                              Biletlər
                            </button>
                            <Link
                              href={`/account/results?examId=${exam.id}`}
                              className="inline-flex items-center gap-1.5 rounded-md border border-neutral-300 bg-white px-3 py-2 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
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

      <Dialog open={ticketOpen} onOpenChange={setTicketOpen}>
        <DialogTrigger asChild>
          <span className="hidden" />
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedExamForTickets
                ? `${selectedExamForTickets.title} — Biletlər`
                : "Biletlərin idarə edilməsi"}
            </DialogTitle>
            <DialogDescription>
              Mövcud biletləri nəzərdən keçirin və yeni kodlar əlavə edin.
            </DialogDescription>
            {selectedExamForTickets ? (
              <>
                <div className="rounded-md border border-neutral-200 bg-white p-4 mb-4">
                  <h3 className="font-medium text-neutral-900 mb-2">
                    {selectedExamForTickets.title} - Bilet Kodları
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Qeydiyyatda olan bilet sayı: {selectedExamForTickets.ticketCodes.length}
                  </p>
                  <div className="mt-3 max-h-48 space-y-2 overflow-y-auto pr-1">
                    {selectedExamForTickets.ticketCodes.map((code) => (
                      <div
                        key={code}
                        className="flex items-center gap-2 rounded-md border border-neutral-200 bg-neutral-50 p-2 text-sm"
                      >
                        <span className="flex-1 truncate">{code}</span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(code);
                          }}
                          className="text-xs text-brand-600 hover:text-brand-700"
                        >
                          Kopyala
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {ticketError && (
                  <div
                    role="alert"
                    className="rounded-md bg-danger-soft border border-danger/25 p-3 mb-4 text-sm text-danger-fg"
                  >
                    {ticketError}
                  </div>
                )}
                {ticketSuccess && (
                  <div
                    role="status"
                    className="rounded-md bg-success-soft border border-success/20 p-3 mb-4 text-sm text-success-fg"
                  >
                    {ticketSuccess}
                  </div>
                )}

                <div className="rounded-md border border-neutral-200 bg-white p-4">
                  <label htmlFor="ticket-codes" className="mb-2 block font-medium text-neutral-900">Yeni bilet kodları</label>
                  <p id="ticket-codes-help" className="mb-3 text-xs text-neutral-500">
                    Bilet kodlarını vergüllə ayırın (məs.: 1234-5678, 8765-4321)
                  </p>
                  <Input
                    ref={ticketCodeInputRef}
                    id="ticket-codes" aria-invalid={Boolean(ticketError)} aria-describedby="ticket-codes-help" placeholder="ABCD-1234, EFGH-5678"
                    onChange={(e) => setNewTicketCodes(e.target.value)}
                    value={newTicketCodes}
                    className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus-visible:border-brand-600 focus-visible:ring-2 focus-visible:ring-brand-600/20"
                  />
                </div>
              </>
            ) : null}
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setTicketOpen(false)}
            >
              Ləğv et
            </Button>
            <Button
              variant="primary"
              onClick={() => saveTickets()}
              disabled={savingTickets}
            >
              {savingTickets ? "Saxlanılır…" : "Biletləri saxla"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}