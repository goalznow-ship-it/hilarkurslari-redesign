import type { Exam, ExamPhase, ExamStatus } from "./types";

export function examStatus(exam: Exam, now: number = Date.now()): ExamStatus {
  const start = Date.parse(exam.startsAt), end = Date.parse(exam.endsAt);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || now >= end) return "ended";
  if (now < start) return "planned";
  return "active";
}

export const STATUS_LABELS: Record<ExamStatus, string> = {
  planned: "Gözləmədə",
  active: "Açıq",
  ended: "Bitib",
};

export const STATUS_STYLES: Record<ExamStatus, string> = {
  planned: "bg-yellow-100 text-yellow-800",
  active: "bg-green-100 text-green-800",
  ended: "bg-gray-100 text-gray-600",
};

/* Kitabça hazırlıq vəziyyətləri */

export const PHASE_LABELS: Record<ExamPhase, string> = {
  preparing: "Kitabça Hazırlanır",
  first_ready: "İlk Versiya Hazırdır",
  review: "Yoxlanılır",
  done: "Tamamlandı",
};

export const PHASE_STYLES: Record<ExamPhase, string> = {
  preparing: "bg-blue-100 text-blue-700",
  first_ready: "bg-orange-100 text-orange-700",
  review: "bg-violet-100 text-violet-700",
  done: "bg-emerald-100 text-emerald-700",
};

export const PHASE_ORDER: ExamPhase[] = [
  "preparing",
  "first_ready",
  "review",
  "done",
];

/** Cari tədris ili (sentyabr-dan başlayır): "2026-2027" */
export function currentAcademicYear(now: number = Date.now()): string {
  const d = new Date(now);
  const startYear = d.getMonth() >= 8 ? d.getFullYear() : d.getFullYear() - 1;
  return `${startYear}-${startYear + 1}`;
}

const FIN_RE = /^[A-Z0-9]{7}$/;
const TICKET_RE = /^[A-Z0-9]{4}-[A-Z0-9]{4}$/;

export function isValidFin(value: string): boolean {
  return FIN_RE.test(value.trim().toUpperCase());
}

export function normalizeFin(value: string): string {
  return value.trim().toUpperCase();
}

export function isValidTicket(value: string): boolean {
  return TICKET_RE.test(value.trim().toUpperCase());
}

export function normalizeTicket(value: string): string {
  let v = value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (v.length > 4) {
    v = `${v.slice(0, 4)}-${v.slice(0 + 4, 8)}`;
  }
  return v;
}

export function formatDateTime(isoStr: string): string {
  const d = new Date(isoStr);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatDateTimeLocal(isoStr: string): string {
  const d = new Date(isoStr);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Spreadsheet formulas must remain text, including control/whitespace prefixes. */
export function escapeCsvCell(value: string | number | undefined): string {
  if (value === undefined) return "";
  let text = String(value);
  if (/^[\s\u0000-\u001f]*[=+\-@]/.test(text) || /^[\t\r\n]/.test(text)) text = "'" + text;
  return /[",\r\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
}
